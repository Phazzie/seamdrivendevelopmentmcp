import { z } from "zod";
import { AgentAdapter } from "../adapters/agents.adapter.js";
import { AuditAdapter } from "../adapters/audit.adapter.js";

export type ToolHandler = (args: any) => Promise<any>;

export interface IToolProvider {
  getTools(): any[];
  getHandlers(): Record<string, ToolHandler>;
}

export class ToolRegistry {
  private providers: IToolProvider[] = [];

  register(provider: IToolProvider) {
    this.providers.push(provider);
  }

  getTools() {
    return this.providers.flatMap(p => p.getTools());
  }

  getHandlers(): Record<string, ToolHandler> {
    const handlers: Record<string, ToolHandler> = {};
    for (const p of this.providers) {
      Object.assign(handlers, p.getHandlers());
    }
    return handlers;
  }
}

/**
 * Purpose: Centralize tool execution logic, auditing, and agent tracking (infrastructure seam).
 * Hardened: Truncates large audit summaries to prevent memory bloat.
 */
export class ToolExecutor {
  private static readonly MAX_LOG_SIZE = 10000; // 10KB limit
  private static readonly MAX_DEPTH = 4;
  private static readonly MAX_KEYS = 50;
  private static readonly MAX_ARRAY_LENGTH = 50;
  private static readonly MAX_STRING_LENGTH = 2000;

  constructor(
    private readonly agents: AgentAdapter,
    private readonly audit: AuditAdapter
  ) {}

  async execute(name: string, handler: ToolHandler, args: any): Promise<any> {
    const agentId = args?.agentId;
    if (agentId && typeof agentId === "string") await this.agents.touch(agentId);

    const result = await handler(args);

    try {
      const argsSummary = this.safeSummarize(args);
      const resultSummary = this.safeSummarize(result);
      
      await this.audit.record(
        agentId || "system", 
        name, 
        argsSummary, 
        resultSummary
      );
    } catch (err) {
      console.error(`[Audit] Failed to record tool ${name}:`, err);
    }

    return result;
  }

  private safeSummarize(value: unknown): string {
    try {
      const truncated = this.truncateValue(value, 0, new WeakSet<object>());
      const str = JSON.stringify(truncated);
      if (str.length > ToolExecutor.MAX_LOG_SIZE) {
        return str.substring(0, ToolExecutor.MAX_LOG_SIZE) + "... [TRUNCATED]";
      }
      return str;
    } catch (err) {
      console.error("[Audit] Failed to summarize value:", err);
      return "[UNSERIALIZABLE]";
    }
  }

  private truncateValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === "string") {
      if (value.length > ToolExecutor.MAX_STRING_LENGTH) {
        return value.slice(0, ToolExecutor.MAX_STRING_LENGTH) + "... [TRUNCATED]";
      }
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "symbol") return value.toString();
    if (typeof value === "function") return "[FUNCTION]";

    if (value instanceof Date) return value.toISOString();
    if (value instanceof Error) return { name: value.name, message: value.message };
    if (value instanceof ArrayBuffer) return `[Binary ${value.byteLength} bytes]`;
    if (ArrayBuffer.isView(value)) return `[Binary ${value.byteLength} bytes]`;

    if (value instanceof Map) {
      const entries: unknown[] = [];
      let index = 0;
      for (const [key, val] of value.entries()) {
        if (index >= ToolExecutor.MAX_ARRAY_LENGTH) {
          entries.push(`[... ${value.size - ToolExecutor.MAX_ARRAY_LENGTH} more entries]`);
          break;
        }
        entries.push([
          this.truncateValue(key, depth + 1, seen),
          this.truncateValue(val, depth + 1, seen),
        ]);
        index += 1;
      }
      return { __type: "Map", entries };
    }

    if (value instanceof Set) {
      const entries: unknown[] = [];
      let index = 0;
      for (const val of value.values()) {
        if (index >= ToolExecutor.MAX_ARRAY_LENGTH) {
          entries.push(`[... ${value.size - ToolExecutor.MAX_ARRAY_LENGTH} more entries]`);
          break;
        }
        entries.push(this.truncateValue(val, depth + 1, seen));
        index += 1;
      }
      return { __type: "Set", entries };
    }

    if (typeof value === "object") {
      if (seen.has(value)) return "[CYCLE]";
      if (depth >= ToolExecutor.MAX_DEPTH) return "[TRUNCATED]";
      seen.add(value);

      if (Array.isArray(value)) {
        const items = value
          .slice(0, ToolExecutor.MAX_ARRAY_LENGTH)
          .map((entry) => this.truncateValue(entry, depth + 1, seen));
        if (value.length > ToolExecutor.MAX_ARRAY_LENGTH) {
          items.push(`[... ${value.length - ToolExecutor.MAX_ARRAY_LENGTH} more items]`);
        }
        return items;
      }

      const record = value as Record<string, unknown>;
      const entries = Object.entries(record);
      const output: Record<string, unknown> = {};
      for (const [key, val] of entries.slice(0, ToolExecutor.MAX_KEYS)) {
        output[key] = this.truncateValue(val, depth + 1, seen);
      }
      if (entries.length > ToolExecutor.MAX_KEYS) {
        output.__truncated_keys__ = entries.length - ToolExecutor.MAX_KEYS;
      }
      return output;
    }

    return "[UNSERIALIZABLE]";
  }
}
