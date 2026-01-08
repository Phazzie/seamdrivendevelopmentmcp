#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import path from "path";
import os from "os";
import fs from "fs";

// Adapters
import { StoreAdapter } from "./lib/adapters/store.adapter.js";
import { LockerAdapter } from "./lib/adapters/locker.adapter.js";
import { TaskAdapter } from "./lib/adapters/tasks.adapter.js";
import { DependencyAdapter } from "./lib/adapters/dependency.adapter.js";
import { MessageAdapter } from "./lib/adapters/messages.adapter.js";
import { AgentAdapter } from "./lib/adapters/agents.adapter.js";
import { StatusAdapter } from "./lib/adapters/status.adapter.js";
import { AuditAdapter } from "./lib/adapters/audit.adapter.js";
import { AppError } from "../contracts/store.contract.js";

// Setup
const HOME_DIR = os.homedir();
const STORE_PATH = path.join(HOME_DIR, ".mcp-collaboration", "store.json");

const storeDir = path.dirname(STORE_PATH);
if (!fs.existsSync(storeDir)) {
  fs.mkdirSync(storeDir, { recursive: true });
}

const store = new StoreAdapter(STORE_PATH);
const locker = new LockerAdapter(store);
const tasks = new TaskAdapter(store);
const dependencies = new DependencyAdapter(store);
const messages = new MessageAdapter(store);
const agents = new AgentAdapter(store);
const status = new StatusAdapter(store);
const audit = new AuditAdapter(store);

// MCP Server
const server = new Server(
  {
    name: "mcp-collaboration-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // --- Agents ---
      {
        name: "register_agent",
        description: "Register a new agent identity.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
      },
      {
        name: "whoami",
        description: "Resolve and touch an agent identity by id.",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string" },
          },
          required: ["agentId"],
        },
      },
      {
        name: "list_agents",
        description: "List registered agents.",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string" },
          },
          required: ["agentId"],
        },
      },
      {
        name: "get_status",
        description: "Get a summary snapshot of the server state.",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string" },
          },
          required: ["agentId"],
        },
      },
      {
        name: "list_audit",
        description: "List audit events with optional filters.",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string" },
            filterAgentId: { type: "string" },
            tool: { type: "string" },
            limit: { type: "number" },
          },
          required: ["agentId"],
        },
      },
      // --- Locks ---
      {
        name: "request_file_locks",
        description: "Acquire exclusive locks for files. Prevents others from editing them.",
        inputSchema: {
          type: "object",
          properties: {
            paths: { type: "array", items: { type: "string" } },
            agentId: { type: "string" },
            reason: { type: "string" },
            ttlMs: { type: "number", default: 60000 },
          },
          required: ["paths", "reason", "agentId"],
        },
      },
      {
        name: "release_file_locks",
        description: "Release locks for files you own.",
        inputSchema: {
          type: "object",
          properties: {
            paths: { type: "array", items: { type: "string" } },
            agentId: { type: "string" },
          },
          required: ["paths", "agentId"],
        },
      },
      {
        name: "renew_file_locks",
        description: "Renew locks for files you own.",
        inputSchema: {
          type: "object",
          properties: {
            paths: { type: "array", items: { type: "string" } },
            ttlMs: { type: "number", default: 60000 },
            agentId: { type: "string" },
          },
          required: ["paths", "agentId"],
        },
      },
      {
        name: "list_locks",
        description: "List active locks.",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string" },
          },
          required: ["agentId"],
        },
      },
      {
        name: "force_release_locks",
        description: "Forcefully release locks (admin recovery).",
        inputSchema: {
          type: "object",
          properties: {
            paths: { type: "array", items: { type: "string" } },
            agentId: { type: "string" },
          },
          required: ["paths", "agentId"],
        },
      },
      // --- Tasks ---
      {
        name: "create_task",
        description: "Create a new task in the shared board.",
        inputSchema: {
            type: "object",
            properties: {
                title: { type: "string" },
                description: { type: "string" },
                assignee: { type: "string" },
                agentId: { type: "string" }
            },
            required: ["title", "description", "agentId"]
        }
      },
      {
        name: "update_task_status",
        description: "Update task status.",
        inputSchema: {
            type: "object",
            properties: {
                taskId: { type: "string" },
                status: { type: "string", enum: ["todo", "in_progress", "review_pending", "done"] },
                agentId: { type: "string" }
            },
            required: ["taskId", "status", "agentId"]
        }
      },
      {
          name: "list_tasks",
          description: "List tasks.",
          inputSchema: {
              type: "object",
              properties: {
                  status: { type: "string", enum: ["todo", "in_progress", "review_pending", "done"] },
                  agentId: { type: "string" }
              },
              required: ["agentId"]
          }
      },
      // --- Dependencies ---
      {
        name: "add_dependency",
        description: "Add a prerequisite relationship between tasks.",
        inputSchema: {
          type: "object",
          properties: {
            childId: { type: "string" },
            parentId: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["childId", "parentId", "agentId"]
        }
      },
      {
        name: "remove_dependency",
        description: "Remove a prerequisite relationship between tasks.",
        inputSchema: {
          type: "object",
          properties: {
            childId: { type: "string" },
            parentId: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["childId", "parentId", "agentId"]
        }
      },
      {
        name: "get_dependencies",
        description: "Get dependencies for a task.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["taskId", "agentId"]
        }
      },
      {
        name: "list_actionable_tasks",
        description: "List tasks whose dependencies are complete.",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["todo", "in_progress", "review_pending", "done"] },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      // --- Messages ---
      {
          name: "post_message",
          description: "Post a message to the shared log.",
          inputSchema: {
              type: "object",
              properties: {
                  content: { type: "string" },
                  sender: { type: "string" }, // Ideally inferred
                  metadata: { type: "object" },
                  agentId: { type: "string" }
              },
              required: ["content", "sender", "agentId"]
          }
      },
      {
          name: "list_messages",
          description: "Read recent messages.",
          inputSchema: {
              type: "object",
              properties: {
                  limit: { type: "number", default: 50 },
                  agentId: { type: "string" }
              },
              required: ["agentId"]
          }
      },
      {
          name: "wait_for_update",
          description: "Long Poll: Wait until store revision > sinceRevision.",
          inputSchema: {
              type: "object",
              properties: {
                  sinceRevision: { type: "number" },
                  timeoutMs: { type: "number", default: 30000 },
                  agentId: { type: "string" }
              },
              required: ["sinceRevision", "agentId"]
          }
      },
      // --- Panic ---
      {
          name: "trigger_panic",
          description: "EMERGENCY: Freeze all locks.",
          inputSchema: {
              type: "object",
              properties: {
                  reason: { type: "string" }
              },
              required: ["reason"]
          }
      },
      {
          name: "resolve_panic",
          description: "Disable panic mode.",
          inputSchema: {
              type: "object",
              properties: {}
          }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const requireAgentId = async (): Promise<string> => {
    const agentId = (args as any).agentId as string;
    if (!agentId) {
      throw new AppError("VALIDATION_FAILED", "agentId is required");
    }
    await agents.touch(agentId);
    return agentId;
  };

  const summarize = (value: unknown): string => {
    try {
      return JSON.stringify(value ?? null);
    } catch (err) {
      return "\"[unserializable]\"";
    }
  };

  const recordAudit = async (
    agentId: string,
    tool: string,
    argsSummary: string,
    resultSummary: string,
    errorCode?: string
  ): Promise<void> => {
    try {
      await audit.record(agentId, tool, argsSummary, resultSummary, errorCode);
    } catch (err) {
      console.error("Audit log failed:", err);
    }
  };

  try {
    // --- Agents ---
    if (name === "register_agent") {
      const agentName = (args as any).name as string;
      const agent = await agents.register(agentName);
      await recordAudit(agent.id, name, summarize({ name: agentName }), summarize(agent));
      return { content: [{ type: "text", text: JSON.stringify(agent, null, 2) }] };
    }

    if (name === "whoami") {
      const agentId = (args as any).agentId as string;
      const agent = await agents.resolve(agentId);
      await agents.touch(agentId);
      await recordAudit(agentId, name, summarize({ agentId }), summarize(agent));
      return { content: [{ type: "text", text: JSON.stringify(agent, null, 2) }] };
    }

    if (name === "list_agents") {
      const agentId = await requireAgentId();
      const list = await agents.list();
      await recordAudit(agentId, name, summarize(args), summarize(list));
      return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    if (name === "get_status") {
      const agentId = await requireAgentId();
      const snapshot = await status.getStatus();
      await recordAudit(agentId, name, summarize(args), summarize(snapshot));
      return { content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }] };
    }

    if (name === "list_audit") {
      const agentId = await requireAgentId();
      const filterAgentId = (args as any).filterAgentId as string | undefined;
      const tool = (args as any).tool as string | undefined;
      const limit = (args as any).limit as number | undefined;
      const list = await audit.list({ agentId: filterAgentId, tool, limit });
      await recordAudit(agentId, name, summarize(args), summarize(list));
      return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    // --- Locks ---
    if (name === "request_file_locks") {
      const paths = (args as any).paths as string[];
      const reason = (args as any).reason as string;
      const ttlMs = (args as any).ttlMs || 60000;
      const ownerId = await requireAgentId();
      const locks = await locker.acquire(paths, ownerId, ttlMs, reason);
      await recordAudit(ownerId, name, summarize(args), summarize({ success: true, locks }));
      return { content: [{ type: "text", text: JSON.stringify({ success: true, locks }, null, 2) }] };
    }

    if (name === "release_file_locks") {
      const paths = (args as any).paths as string[];
      const ownerId = await requireAgentId();
      await locker.release(paths, ownerId);
      await recordAudit(ownerId, name, summarize(args), summarize({ success: true }));
      return { content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }] };
    }

    if (name === "renew_file_locks") {
      const paths = (args as any).paths as string[];
      const ttlMs = (args as any).ttlMs || 60000;
      const ownerId = await requireAgentId();
      const locks = await locker.renew(paths, ownerId, ttlMs);
      await recordAudit(ownerId, name, summarize(args), summarize({ success: true, locks }));
      return { content: [{ type: "text", text: JSON.stringify({ success: true, locks }, null, 2) }] };
    }

    if (name === "list_locks") {
      const agentId = await requireAgentId();
      const list = await locker.list();
      await recordAudit(agentId, name, summarize(args), summarize(list));
      return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    if (name === "force_release_locks") {
      const paths = (args as any).paths as string[];
      const agentId = await requireAgentId();
      await locker.forceRelease(paths);
      await recordAudit(agentId, name, summarize(args), summarize({ success: true }));
      return { content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }] };
    }

    // --- Tasks ---
    if (name === "create_task") {
        const title = (args as any).title as string;
        const description = (args as any).description as string;
        const assignee = (args as any).assignee as string;
        const agentId = await requireAgentId();
        const task = await tasks.create(title, description, assignee);
        await recordAudit(agentId, name, summarize(args), summarize(task));
        return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
    }

    if (name === "update_task_status") {
        const taskId = (args as any).taskId as string;
        const status = (args as any).status as any;
        const agentId = await requireAgentId();
        const task = await tasks.updateStatus(taskId, status);
        await recordAudit(agentId, name, summarize(args), summarize(task));
        return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
    }

    if (name === "list_tasks") {
        const status = (args as any).status as any;
        const agentId = await requireAgentId();
        const list = await tasks.list(status);
        await recordAudit(agentId, name, summarize(args), summarize(list));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    // --- Dependencies ---
    if (name === "add_dependency") {
        const childId = (args as any).childId as string;
        const parentId = (args as any).parentId as string;
        const agentId = await requireAgentId();
        const task = await dependencies.addDependency(childId, parentId);
        await recordAudit(agentId, name, summarize(args), summarize(task));
        return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
    }

    if (name === "remove_dependency") {
        const childId = (args as any).childId as string;
        const parentId = (args as any).parentId as string;
        const agentId = await requireAgentId();
        const task = await dependencies.removeDependency(childId, parentId);
        await recordAudit(agentId, name, summarize(args), summarize(task));
        return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
    }

    if (name === "get_dependencies") {
        const taskId = (args as any).taskId as string;
        const agentId = await requireAgentId();
        const info = await dependencies.getDependencies(taskId);
        await recordAudit(agentId, name, summarize(args), summarize(info));
        return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
    }

    if (name === "list_actionable_tasks") {
        const status = (args as any).status as any;
        const agentId = await requireAgentId();
        const list = await dependencies.listActionable(status);
        await recordAudit(agentId, name, summarize(args), summarize(list));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    // --- Messages ---
    if (name === "post_message") {
        const content = (args as any).content as string;
        const sender = (args as any).sender as string;
        const metadata = (args as any).metadata as any;
        const agentId = await requireAgentId();
        const msg = await messages.post(sender, content, metadata);
        await recordAudit(agentId, name, summarize(args), summarize(msg));
        return { content: [{ type: "text", text: JSON.stringify(msg, null, 2) }] };
    }

    if (name === "list_messages") {
        const limit = (args as any).limit || 50;
        const agentId = await requireAgentId();
        const list = await messages.list(limit);
        await recordAudit(agentId, name, summarize(args), summarize(list));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    if (name === "wait_for_update") {
        const sinceRevision = (args as any).sinceRevision as number;
        const timeoutMs = (args as any).timeoutMs || 30000;
        const agentId = await requireAgentId();
        const event = await messages.waitForUpdate(sinceRevision, timeoutMs);
        await recordAudit(agentId, name, summarize(args), summarize(event));
        return { content: [{ type: "text", text: JSON.stringify(event, null, 2) }] };
    }

    // --- Panic ---
    if (name === "trigger_panic") {
        await store.update((c) => { c.panic_mode = true; return c; }, (await store.load()).revision);
        await recordAudit("system", name, summarize(args), summarize({ panic_mode: true }));
        return { content: [{ type: "text", text: "PANIC MODE ENABLED" }] };
    }

    if (name === "resolve_panic") {
        await store.update((c) => { c.panic_mode = false; return c; }, (await store.load()).revision);
        await recordAudit("system", name, summarize(args), summarize({ panic_mode: false }));
        return { content: [{ type: "text", text: "Panic mode resolved" }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err: any) {
    const code = err.code || "UNKNOWN";
    const agentId = (args as any)?.agentId || "system";
    await recordAudit(agentId, name, summarize(args), summarize({ error: err.message }), code);
    return {
      content: [{ type: "text", text: `ERROR [${code}]: ${err.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Collaboration Server running on STDIO");
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
