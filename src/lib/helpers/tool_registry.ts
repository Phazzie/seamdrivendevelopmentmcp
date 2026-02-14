import { z } from "zod";
import { AgentAdapter } from "../adapters/agents.adapter.js";
import { AuditAdapter } from "../adapters/audit.adapter.js";
import { AppError } from "../../../contracts/store.contract.js";
import type { IStore } from "../../../contracts/store.contract.js";

export type ToolHandler = (args: any) => Promise<any>;

export interface IToolProvider {
  getTools(): any[];
  getHandlers(): Record<string, ToolHandler>;
}

export class ToolRegistry {
  private providers: IToolProvider[] = [];
  private readonly toolNames = new Set<string>();
  private readonly handlerNames = new Set<string>();

  register(provider: IToolProvider) {
    const tools = provider.getTools();
    const handlers = provider.getHandlers();
    const handlerKeys = Object.keys(handlers);

    for (const tool of tools) {
      const name = tool?.name;
      if (typeof name !== "string" || name.length === 0) {
        throw new AppError("VALIDATION_FAILED", "Tool registration failed: tool is missing a valid name.");
      }
      if (this.toolNames.has(name)) {
        throw new AppError("VALIDATION_FAILED", `Tool registration failed: duplicate tool name '${name}'.`);
      }
      if (!handlerKeys.includes(name)) {
        throw new AppError("VALIDATION_FAILED", `Tool registration failed: missing handler for tool '${name}'.`);
      }
    }

    for (const handlerName of handlerKeys) {
      if (this.handlerNames.has(handlerName)) {
        throw new AppError("VALIDATION_FAILED", `Tool registration failed: duplicate handler '${handlerName}'.`);
      }
    }

    this.providers.push(provider);
    for (const tool of tools) this.toolNames.add(tool.name);
    for (const handlerName of handlerKeys) this.handlerNames.add(handlerName);
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
  private static readonly PUBLIC_TOOLS = new Set(["register_agent", "list_agents"]);
  private static readonly MUTATING_TOOLS = new Set([
    "register_agent",
    "create_task",
    "update_task_status",
    "add_dependency",
    "knowledge_add_node",
    "knowledge_link_nodes",
    "create_adr",
    "ideas_create",
    "ideas_add_note",
    "request_file_locks",
    "release_file_locks",
    "post_message",
    "publish_event",
    "send_notification",
    "submit_plan",
    "submit_critique",
    "approve_plan",
    "trigger_panic",
    "resolve_panic",
    "scaffold_seam",
    "run_probe",
    "spawn_worker",
    "stop_worker",
    "dispatch_task",
  ]);
  private static readonly PANIC_EXEMPT_MUTATIONS = new Set(["trigger_panic", "resolve_panic"]);

  constructor(
    private readonly agents: AgentAdapter,
    private readonly audit: AuditAdapter,
    private readonly store: IStore
  ) {}

  async execute(name: string, handler: ToolHandler, args: any): Promise<any> {
    const agentId = await this.resolveAgentContext(name, args);
    await this.assertWriteAllowed(name);

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

  private async resolveAgentContext(name: string, args: unknown): Promise<string | null> {
    if (ToolExecutor.PUBLIC_TOOLS.has(name)) {
      return null;
    }

    if (!args || typeof args !== "object") {
      throw new AppError("VALIDATION_FAILED", `Tool '${name}' requires agentId.`);
    }

    const rawAgentId = (args as Record<string, unknown>).agentId;
    if (typeof rawAgentId !== "string" || rawAgentId.trim().length === 0) {
      throw new AppError("VALIDATION_FAILED", `Tool '${name}' requires a valid agentId.`);
    }

    await this.agents.touch(rawAgentId);
    return rawAgentId;
  }

  private async assertWriteAllowed(name: string): Promise<void> {
    if (!ToolExecutor.MUTATING_TOOLS.has(name)) return;
    if (ToolExecutor.PANIC_EXEMPT_MUTATIONS.has(name)) return;

    const current = await this.store.load();
    if (current.panic_mode) {
      throw new AppError(
        "PANIC_MODE",
        `System is in panic mode. Tool '${name}' is blocked.`
      );
    }
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
