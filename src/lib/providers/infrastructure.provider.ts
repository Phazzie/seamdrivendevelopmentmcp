import { z } from "zod";
import { IToolProvider, ToolHandler } from "../helpers/tool_registry.js";
import { LockerAdapter } from "../adapters/locker.adapter.js";
import { AgentAdapter } from "../adapters/agents.adapter.js";
import { StatusAdapter } from "../adapters/status.adapter.js";
import { AuditAdapter } from "../adapters/audit.adapter.js";
import { PathGuard } from "../helpers/path_guard.js";
import { AgentNameSchema, AgentSelfNameSchema } from "../../../contracts/agents.contract.js";

/**
 * Purpose: Infrastructure Tool Provider (infrastructure seam).
 * Hardened: Descriptions include AI-Directives.
 */
export class InfrastructureProvider implements IToolProvider {
  private readonly assignedModel: z.infer<typeof AgentNameSchema>;

  constructor(
    private locker: LockerAdapter,
    private agents: AgentAdapter,
    private status: StatusAdapter,
    private audit: AuditAdapter,
    private pathGuard: PathGuard
  ) {
    this.assignedModel = AgentNameSchema.parse(process.env.MCP_AGENT_MODEL || "User");
  }

  getTools() {
    return [
      {
        name: "register_agent",
        description: "Register a new agent identity. AI DIRECTIVE: Choose a unique session name (e.g. an AI rapper alias). Model is assigned by server policy.",
        inputSchema: { 
          type: "object", 
          properties: { 
            name: { type: "string", minLength: 2, maxLength: 64, description: "Your session alias (not model name)." }
          }, 
          required: ["name"] 
        }
      },
      {
        name: "list_agents",
        description: "List all registered agents.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_status",
        description: "Get summary of server state.",
        inputSchema: { type: "object", properties: { agentId: { type: "string" } }, required: ["agentId"] }
      },
      {
        name: "list_audit",
        description: "View the system audit log. AI DIRECTIVE: Check this to monitor agent actions.",
        inputSchema: {
          type: "object",
          properties: { 
            agentId: { type: "string" },
            limit: { type: "number", default: 50 } 
          },
          required: ["agentId"]
        }
      },
      {
        name: "list_locks",
        description: "List all active file locks.",
        inputSchema: { type: "object", properties: { agentId: { type: "string" } }, required: ["agentId"] }
      },
      {
        name: "request_file_locks",
        description: "Acquire exclusive locks. AI DIRECTIVE: Plan MUST be submitted first.",
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
          properties: { paths: { type: "array", items: { type: "string" } }, agentId: { type: "string" } },
          required: ["paths", "agentId"]
        }
      }
    ];
  }

  getHandlers(): Record<string, ToolHandler> {
    return {
      register_agent: async (args) => {
        const input = z.union([
          z.object({ name: AgentSelfNameSchema }).strict(),
          z.object({ selfName: AgentSelfNameSchema }).strict(),
        ]).parse(args);
        const chosenName = "name" in input ? input.name : input.selfName;
        return await this.agents.register(this.assignedModel, chosenName);
      },
      list_agents: async (args) => {
        z.object({}).passthrough().parse(args ?? {});
        return await this.agents.list();
      },
      get_status: async (args) => {
        z.object({ agentId: z.string() }).parse(args);
        return await this.status.getStatus();
      },
      list_audit: async (args) => {
        const input = z.object({ limit: z.number().optional(), agentId: z.string() }).parse(args);
        // Fix: Pass options object to list
        return await this.audit.list({ limit: input.limit || 50 });
      },
      list_locks: async (args) => {
        z.object({ agentId: z.string() }).parse(args);
        return await this.locker.list();
      },
      request_file_locks: async (args) => {
        const input = z.object({
          paths: z.array(z.string()),
          agentId: z.string(),
          reason: z.string(),
          ttlMs: z.number().optional()
        }).parse(args);
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
