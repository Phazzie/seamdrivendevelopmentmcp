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
  private static readonly MAX_LOG_SIZE = 50000; // 50KB limit

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

  private safeSummarize(value: any): string {
    try {
      const str = JSON.stringify(value);
      if (str.length > ToolExecutor.MAX_LOG_SIZE) {
        return str.substring(0, ToolExecutor.MAX_LOG_SIZE) + "... [TRUNCATED]";
      }
      return str;
    } catch {
      return "[UNSERIALIZABLE]";
    }
  }
}
