import { z } from "zod";
import { IToolProvider, ToolHandler } from "../helpers/tool_registry.js";
import { LockerAdapter } from "../adapters/locker.adapter.js";
import { AgentAdapter } from "../adapters/agents.adapter.js";
import { StatusAdapter } from "../adapters/status.adapter.js";
import { AuditAdapter } from "../adapters/audit.adapter.js";
import { PathGuard } from "../helpers/path_guard.js";

export class InfrastructureProvider implements IToolProvider {
  constructor(
    private locker: LockerAdapter,
    private agents: AgentAdapter,
    private status: StatusAdapter,
    private audit: AuditAdapter,
    private pathGuard: PathGuard
  ) {}

  getTools() {
    return [
      {
        name: "get_status",
        description: "Get a summary snapshot of the server state.",
        inputSchema: {
          type: "object",
          properties: { agentId: { type: "string" } },
          required: ["agentId"]
        }
      },
      {
        name: "request_file_locks",
        description: "Acquire exclusive locks for files. Prevents others from editing them.",
        inputSchema: {
          type: "object",
          properties: {
            paths: { type: "array", items: { type: "string" } },
            agentId: { type: "string" },
            reason: { type: "string" },
            ttlMs: { type: "number", default: 60000 }
          },
          required: ["paths", "reason", "agentId"]
        }
      },
      {
        name: "release_file_locks",
        description: "Release locks for files you own.",
        inputSchema: {
          type: "object",
          properties: {
            paths: { type: "array", items: { type: "string" } },
            agentId: { type: "string" }
          },
          required: ["paths", "agentId"]
        }
      }
    ];
  }

  getHandlers(): Record<string, ToolHandler> {
    return {
      get_status: async () => await this.status.getStatus(),
      request_file_locks: async (args) => {
        const input = z.object({
          paths: z.array(z.string()),
          agentId: z.string(),
          reason: z.string(),
          ttlMs: z.number().optional()
        }).parse(args);

        // Senior Mandate: Path Jailing
        const validatedPaths = await Promise.all(input.paths.map(p => this.pathGuard.validate(p)));
        
        return await this.locker.acquire(validatedPaths, input.agentId, input.ttlMs || 60000, input.reason);
      },
      release_file_locks: async (args) => {
        const input = z.object({ paths: z.array(z.string()), agentId: z.string() }).parse(args);
        const validatedPaths = await Promise.all(input.paths.map(p => this.pathGuard.validate(p)));
        return await this.locker.release(validatedPaths, input.agentId);
      }
    };
  }
}
