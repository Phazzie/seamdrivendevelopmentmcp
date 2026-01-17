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
import { IdeaAdapter } from "./lib/adapters/ideas.adapter.js";
import { DependencyAdapter } from "./lib/adapters/dependency.adapter.js";
import { SchedulerAdapter } from "./lib/adapters/scheduler.adapter.js";
import { KnowledgeAdapter } from "./lib/adapters/knowledge.adapter.js";
import { AdrAdapter } from "./lib/adapters/adr.adapter.js";
import { EventStreamAdapter } from "./lib/adapters/event_stream.adapter.js";
import { NotificationAdapter } from "./lib/adapters/notifications.adapter.js";
import { ConfidenceAuctionAdapter } from "./lib/adapters/confidence_auction.adapter.js";
import { MoodAdapter } from "./lib/adapters/mood.adapter.js";
import { ArbitrationAdapter } from "./lib/adapters/arbitration.adapter.js";
import { ReviewGateAdapter } from "./lib/adapters/review_gate.adapter.js";
import { MessageAdapter } from "./lib/adapters/messages.adapter.js";
import { AgentAdapter } from "./lib/adapters/agents.adapter.js";
import { StatusAdapter } from "./lib/adapters/status.adapter.js";
import { AuditAdapter } from "./lib/adapters/audit.adapter.js";
import { ProbeRunnerAdapter } from "./lib/adapters/probe_runner.adapter.js";
import { ScaffolderAdapter } from "./lib/adapters/scaffolder.adapter.js";
import { SddTrackingAdapter } from "./lib/adapters/sdd_tracking.adapter.js";
import { AppError } from "../contracts/store.contract.js";

// Setup
const HOME_DIR = os.homedir();
const STORE_PATH = process.env.MCP_STORE_PATH
  ? path.resolve(process.env.MCP_STORE_PATH)
  : path.join(HOME_DIR, ".mcp-collaboration", "store.json");

const storeDir = path.dirname(STORE_PATH);
if (!fs.existsSync(storeDir)) {
  fs.mkdirSync(storeDir, { recursive: true });
}

console.error(`[MCP] Using Store: ${STORE_PATH}`);

const store = new StoreAdapter(STORE_PATH);
const locker = new LockerAdapter(store, path.join(process.cwd(), "fixtures/locker/capabilities.json"));
const tasks = new TaskAdapter(store);
const ideas = new IdeaAdapter(store);
const dependencies = new DependencyAdapter(store);
const scheduler = new SchedulerAdapter();
const knowledge = new KnowledgeAdapter(store);
const adrs = new AdrAdapter(store);
const eventStream = new EventStreamAdapter(store);
const notifications = new NotificationAdapter(store);
const confidenceAuction = new ConfidenceAuctionAdapter();
const moods = new MoodAdapter(store);
const arbitration = new ArbitrationAdapter(store);
const reviewGates = new ReviewGateAdapter(store);
const messages = new MessageAdapter(store);
const agents = new AgentAdapter(store);
const status = new StatusAdapter(store);
const audit = new AuditAdapter(store);
const probeRunner = new ProbeRunnerAdapter(process.cwd());
const scaffolder = new ScaffolderAdapter();
const sddTracking = new SddTrackingAdapter(process.cwd());

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

// Tool Input Schemas
const AgentIdSchema = z.object({ agentId: z.string() });
const OptionalAgentIdSchema = z.object({ agentId: z.string().optional() });

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "run_probe",
        description: "Run executable probes to verify environment and refresh fixtures.",
        inputSchema: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Glob or substring pattern for probe files." },
            agentId: { type: "string" },
          },
          required: ["agentId"],
        },
      },
      {
        name: "scaffold_seam",
        description: "Scaffold a new SDD seam (Contract, Probe, Mock, Test, Adapter).",
        inputSchema: {
          type: "object",
          properties: {
            seamName: { type: "string" },
            agentId: { type: "string" },
          },
          required: ["seamName", "agentId"],
        },
      },
      {
        name: "get_sdd_report",
        description: "Get the project's Seam-Driven Development compliance report.",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string" },
          },
          required: ["agentId"],
        },
      },
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
      {
        name: "create_idea",
        description: "Create a new idea.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            status: { type: "string", enum: ["draft", "active", "parked", "archived"] },
            tags: { type: "array", items: { type: "string" } },
            relatedTaskIds: { type: "array", items: { type: "string" } },
            relatedIdeaIds: { type: "array", items: { type: "string" } },
            agentId: { type: "string" }
          },
          required: ["title", "agentId"]
        }
      },
      {
        name: "update_idea",
        description: "Update an idea.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
            status: { type: "string", enum: ["draft", "active", "parked", "archived"] },
            tags: { type: "array", items: { type: "string" } },
            relatedTaskIds: { type: "array", items: { type: "string" } },
            relatedIdeaIds: { type: "array", items: { type: "string" } },
            agentId: { type: "string" }
          },
          required: ["id", "agentId"]
        }
      },
      {
        name: "list_ideas",
        description: "List ideas with optional filters.",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["draft", "active", "parked", "archived"] },
            tag: { type: "string" },
            query: { type: "string" },
            limit: { type: "number" },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "get_idea",
        description: "Fetch a single idea.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["id", "agentId"]
        }
      },
      {
        name: "add_idea_note",
        description: "Add a note to an idea.",
        inputSchema: {
          type: "object",
          properties: {
            ideaId: { type: "string" },
            author: { type: "string" },
            body: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["ideaId", "body", "agentId"]
        }
      },
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
      {
        name: "divvy_work",
        description: "Assign unassigned tasks to agents based on role and availability.",
        inputSchema: {
          type: "object",
          properties: {
            tasks: { type: "array", items: { type: "object" } },
            agents: { type: "array", items: { type: "object" } },
            agentId: { type: "string" }
          },
          required: ["tasks", "agents", "agentId"]
        }
      },
      {
        name: "knowledge_add_node",
        description: "Add a node to the shared knowledge graph.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string" },
            content: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["type", "content", "agentId"]
        }
      },
      {
        name: "knowledge_link_nodes",
        description: "Link two knowledge graph nodes.",
        inputSchema: {
          type: "object",
          properties: {
            fromId: { type: "string" },
            toId: { type: "string" },
            relation: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["fromId", "toId", "relation", "agentId"]
        }
      },
      {
        name: "knowledge_query",
        description: "Query the knowledge graph.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string" },
            text: { type: "string" },
            relation: { type: "string" },
            limit: { type: "number" },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "create_adr",
        description: "Create a new ADR entry.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            status: { type: "string", enum: ["proposed", "accepted"] },
            context: { type: "string" },
            decision: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["title", "context", "decision", "agentId"]
        }
      },
      {
        name: "list_adrs",
        description: "List ADR entries.",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["proposed", "accepted"] },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "publish_event",
        description: "Publish an event to the event stream.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string" },
            data: { type: "object" },
            agentId: { type: "string" }
          },
          required: ["type", "agentId"]
        }
      },
      {
        name: "get_recent_events",
        description: "List recent events from the event stream.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number" },
            type: { type: "string" },
            since: { type: "number" },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "subscribe_to_events",
        description: "Wait for new events matching the filters.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number" },
            type: { type: "string" },
            since: { type: "number" },
            timeoutMs: { type: "number" },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "send_notification",
        description: "Send a priority notification.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            message: { type: "string" },
            priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
            agentId: { type: "string" }
          },
          required: ["title", "message", "agentId"]
        }
      },
      {
        name: "list_notifications",
        description: "List notifications ordered by priority.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number" },
            minPriority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "resolve_confidence_auction",
        description: "Resolve confidence bids and select a winner.",
        inputSchema: {
          type: "object",
          properties: {
            bids: { type: "array", items: { type: "object" } },
            agentId: { type: "string" }
          },
          required: ["bids", "agentId"]
        }
      },
      {
        name: "log_mood",
        description: "Log a mood entry for an agent.",
        inputSchema: {
          type: "object",
          properties: {
            mood: { type: "string" },
            note: { type: "string" },
            subjectAgentId: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["mood", "agentId"]
        }
      },
      {
        name: "list_moods",
        description: "List mood entries.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number" },
            filterAgentId: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "get_gavel_state",
        description: "Get the current gavel state.",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "request_gavel",
        description: "Request human arbitration.",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "grant_gavel",
        description: "Grant the gavel to an agent.",
        inputSchema: {
          type: "object",
          properties: {
            targetAgentId: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["targetAgentId", "agentId"]
        }
      },
      {
        name: "release_gavel",
        description: "Release the gavel.",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "submit_plan",
        description: "Submit a plan for critique.",
        inputSchema: {
          type: "object",
          properties: {
            planId: { type: "string" },
            plan: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["planId", "plan", "agentId"]
        }
      },
      {
        name: "submit_critique",
        description: "Submit a critique for a plan.",
        inputSchema: {
          type: "object",
          properties: {
            planId: { type: "string" },
            critique: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["planId", "critique", "agentId"]
        }
      },
      {
        name: "approve_plan",
        description: "Approve a plan after critique.",
        inputSchema: {
          type: "object",
          properties: {
            planId: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["planId", "agentId"]
        }
      },
      {
        name: "get_review_gate",
        description: "Get review gate status for a plan.",
        inputSchema: {
          type: "object",
          properties: {
            planId: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["planId", "agentId"]
        }
      },
      {
        name: "list_review_gates",
        description: "List review gates by status.",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["pending", "critique_submitted", "approved"] },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
          name: "post_message",
          description: "Post a message to the shared log.",
          inputSchema: {
              type: "object",
              properties: {
                  content: { type: "string" },
                  sender: { type: "string" }, // Ideally inferred
                  metadata: { type: "object" },
                  channelId: { type: "string" },
                  threadId: { type: "string" },
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
                  channelId: { type: "string" },
                  threadId: { type: "string" },
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
      },
      {
        name: "get_sdd_report",
        description: "Get the project's Seam-Driven Development compliance report.",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string" },
          },
          required: ["agentId"],
        },
      },
      {
        name: "scaffold_seam",
        description: "Scaffold a new SDD seam (Contract, Probe, Mock, Test, Adapter).",
        inputSchema: {
          type: "object",
          properties: {
            seamName: { type: "string" },
            agentId: { type: "string" },
          },
          required: ["seamName", "agentId"],
        },
      },
      {
        name: "run_probe",
        description: "Run executable probes to verify environment and refresh fixtures.",
        inputSchema: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Glob or substring pattern for probe files." },
            agentId: { type: "string" },
          },
          required: ["agentId"],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const requireAgentId = async (input: unknown): Promise<string> => {
    const parsed = AgentIdSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "agentId is required");
    }
    await agents.touch(parsed.data.agentId);
    return parsed.data.agentId;
  };

  const summarize = (value: unknown): string => {
    try {
      return JSON.stringify(value ?? null);
    } catch (err) {
      return "\[unserializable]";
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
      const input = z.object({ name: z.string() }).parse(args);
      const agent = await agents.register(input.name);
      await recordAudit(agent.id, name, summarize(input), summarize(agent));
      return { content: [{ type: "text", text: JSON.stringify(agent, null, 2) }] };
    }

    if (name === "whoami") {
      const input = AgentIdSchema.parse(args);
      const agent = await agents.resolve(input.agentId);
      await agents.touch(input.agentId);
      await recordAudit(input.agentId, name, summarize(input), summarize(agent));
      return { content: [{ type: "text", text: JSON.stringify(agent, null, 2) }] };
    }

    if (name === "list_agents") {
      const agentId = await requireAgentId(args);
      const list = await agents.list();
      await recordAudit(agentId, name, summarize(args), summarize(list));
      return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    if (name === "get_status") {
      const agentId = await requireAgentId(args);
      const snapshot = await status.getStatus();
      await recordAudit(agentId, name, summarize(args), summarize(snapshot));
      return { content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }] };
    }

    if (name === "list_audit") {
      const agentId = await requireAgentId(args);
      const input = z.object({
        filterAgentId: z.string().optional(),
        tool: z.string().optional(),
        limit: z.number().optional()
      }).parse(args);
      const list = await audit.list({ agentId: input.filterAgentId, tool: input.tool, limit: input.limit });
      await recordAudit(agentId, name, summarize(args), summarize(list));
      return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    // --- Locks ---
    if (name === "request_file_locks") {
      const input = z.object({
        paths: z.array(z.string()),
        reason: z.string(),
        ttlMs: z.number().default(60000),
        agentId: z.string()
      }).parse(args);
      
      const ownerId = await requireAgentId(input);
      const locks = await locker.acquire(input.paths, ownerId, input.ttlMs, input.reason);
      await recordAudit(ownerId, name, summarize(args), summarize({ success: true, locks }));
      return { content: [{ type: "text", text: JSON.stringify({ success: true, locks }, null, 2) }] };
    }

    if (name === "release_file_locks") {
      const input = z.object({
        paths: z.array(z.string()),
        agentId: z.string()
      }).parse(args);
      
      const ownerId = await requireAgentId(input);
      await locker.release(input.paths, ownerId);
      await recordAudit(ownerId, name, summarize(args), summarize({ success: true }));
      return { content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }] };
    }

    if (name === "renew_file_locks") {
      const input = z.object({
        paths: z.array(z.string()),
        ttlMs: z.number().default(60000),
        agentId: z.string()
      }).parse(args);

      const ownerId = await requireAgentId(input);
      const locks = await locker.renew(input.paths, ownerId, input.ttlMs);
      await recordAudit(ownerId, name, summarize(args), summarize({ success: true, locks }));
      return { content: [{ type: "text", text: JSON.stringify({ success: true, locks }, null, 2) }] };
    }

    if (name === "list_locks") {
      const agentId = await requireAgentId(args);
      const list = await locker.list();
      await recordAudit(agentId, name, summarize(args), summarize(list));
      return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    if (name === "force_release_locks") {
      const input = z.object({
        paths: z.array(z.string()),
        agentId: z.string()
      }).parse(args);

      const agentId = await requireAgentId(input);
      await locker.forceRelease(input.paths);
      await recordAudit(agentId, name, summarize(args), summarize({ success: true }));
      return { content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }] };
    }

    // --- Tasks ---
    if (name === "create_task") {
        const input = z.object({
            title: z.string(),
            description: z.string(),
            assignee: z.string().optional(),
            agentId: z.string()
        }).parse(args);

        const agentId = await requireAgentId(input);
        const task = await tasks.create(input.title, input.description, input.assignee);
        await recordAudit(agentId, name, summarize(args), summarize(task));
        return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
    }

    if (name === "update_task_status") {
        const input = z.object({
            taskId: z.string(),
            status: z.enum(["todo", "in_progress", "review_pending", "done"]),
            agentId: z.string()
        }).parse(args);

        const agentId = await requireAgentId(input);
        const task = await tasks.updateStatus(input.taskId, input.status);
        await recordAudit(agentId, name, summarize(args), summarize(task));
        return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
    }

    if (name === "list_tasks") {
        const input = z.object({
            status: z.enum(["todo", "in_progress", "review_pending", "done"]).optional(),
            agentId: z.string()
        }).parse(args);

        const agentId = await requireAgentId(input);
        const list = await tasks.list(input.status);
        await recordAudit(agentId, name, summarize(args), summarize(list));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    // --- Ideas ---
    if (name === "create_idea") {
        const input = z.object({
            title: z.string(),
            summary: z.string().optional(),
            status: z.enum(["draft", "active", "parked", "archived"]).optional(),
            tags: z.array(z.string()).optional(),
            relatedTaskIds: z.array(z.string()).optional(),
            relatedIdeaIds: z.array(z.string()).optional(),
            agentId: z.string()
        }).parse(args);

        const agentId = await requireAgentId(input);
        const idea = await ideas.create(input); 
        await recordAudit(agentId, name, summarize(args), summarize(idea));
        return { content: [{ type: "text", text: JSON.stringify(idea, null, 2) }] };
    }

    if (name === "update_idea") {
        const input = z.object({
            id: z.string(),
            title: z.string().optional(),
            summary: z.string().optional(),
            status: z.enum(["draft", "active", "parked", "archived"]).optional(),
            tags: z.array(z.string()).optional(),
            relatedTaskIds: z.array(z.string()).optional(),
            relatedIdeaIds: z.array(z.string()).optional(),
            agentId: z.string()
        }).parse(args);

        const agentId = await requireAgentId(input);
        const idea = await ideas.update(input);
        await recordAudit(agentId, name, summarize(args), summarize(idea));
        return { content: [{ type: "text", text: JSON.stringify(idea, null, 2) }] };
    }

    if (name === "list_ideas") {
        const input = z.object({
            status: z.enum(["draft", "active", "parked", "archived"]).optional(),
            tag: z.string().optional(),
            query: z.string().optional(),
            limit: z.number().optional(),
            agentId: z.string()
        }).parse(args);

        const agentId = await requireAgentId(input);
        const list = await ideas.list(input);
        await recordAudit(agentId, name, summarize(args), summarize(list));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    if (name === "get_idea") {
        const input = z.object({ id: z.string(), agentId: z.string() }).parse(args);
        const agentId = await requireAgentId(input);
        const idea = await ideas.get({ id: input.id });
        await recordAudit(agentId, name, summarize(args), summarize(idea));
        return { content: [{ type: "text", text: JSON.stringify(idea, null, 2) }] };
    }

    if (name === "add_idea_note") {
        const input = z.object({
            ideaId: z.string(),
            author: z.string(),
            body: z.string(),
            agentId: z.string()
        }).parse(args);

        const agentId = await requireAgentId(input);
        const idea = await ideas.addNote(input);
        await recordAudit(agentId, name, summarize(args), summarize(idea));
        return { content: [{ type: "text", text: JSON.stringify(idea, null, 2) }] };
    }

    // --- Dependencies ---
    if (name === "add_dependency") {
        const input = z.object({ childId: z.string(), parentId: z.string(), agentId: z.string() }).parse(args);
        const agentId = await requireAgentId(input);
        const task = await dependencies.addDependency(input.childId, input.parentId);
        await recordAudit(agentId, name, summarize(args), summarize(task));
        return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
    }

    if (name === "remove_dependency") {
        const input = z.object({ childId: z.string(), parentId: z.string(), agentId: z.string() }).parse(args);
        const agentId = await requireAgentId(input);
        const task = await dependencies.removeDependency(input.childId, input.parentId);
        await recordAudit(agentId, name, summarize(args), summarize(task));
        return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
    }

    if (name === "get_dependencies") {
        const input = z.object({ taskId: z.string(), agentId: z.string() }).parse(args);
        const agentId = await requireAgentId(input);
        const info = await dependencies.getDependencies(input.taskId);
        await recordAudit(agentId, name, summarize(args), summarize(info));
        return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
    }

    if (name === "list_actionable_tasks") {
        const input = z.object({
            status: z.enum(["todo", "in_progress", "review_pending", "done"]).optional(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const list = await dependencies.listActionable(input.status);
        await recordAudit(agentId, name, summarize(args), summarize(list));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    // --- Scheduler ---
    if (name === "divvy_work") {
        const input = z.object({
            tasks: z.array(z.any()),
            agents: z.array(z.any()),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const result = await scheduler.schedule({ tasks: input.tasks, agents: input.agents });
        await recordAudit(agentId, name, summarize(args), summarize(result));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // --- Knowledge ---
    if (name === "knowledge_add_node") {
        const input = z.object({ type: z.string(), content: z.string(), agentId: z.string() }).parse(args);
        const agentId = await requireAgentId(input);
        const node = await knowledge.addNode(input.type, input.content);
        await recordAudit(agentId, name, summarize(args), summarize(node));
        return { content: [{ type: "text", text: JSON.stringify(node, null, 2) }] };
    }

    if (name === "knowledge_link_nodes") {
        const input = z.object({ fromId: z.string(), toId: z.string(), relation: z.string(), agentId: z.string() }).parse(args);
        const agentId = await requireAgentId(input);
        const edge = await knowledge.linkNodes(input.fromId, input.toId, input.relation);
        await recordAudit(agentId, name, summarize(args), summarize(edge));
        return { content: [{ type: "text", text: JSON.stringify(edge, null, 2) }] };
    }

    if (name === "knowledge_query") {
        const input = z.object({
            type: z.string().optional(),
            text: z.string().optional(),
            relation: z.string().optional(),
            limit: z.number().optional(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const result = await knowledge.query(input);
        await recordAudit(agentId, name, summarize(args), summarize(result));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // --- ADRs ---
    if (name === "create_adr") {
        const input = z.object({
            title: z.string(),
            status: z.enum(["proposed", "accepted"]).optional(),
            context: z.string(),
            decision: z.string(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const entry = await adrs.create(input);
        await recordAudit(agentId, name, summarize(args), summarize(entry));
        return { content: [{ type: "text", text: JSON.stringify(entry, null, 2) }] };
    }

    if (name === "list_adrs") {
        const input = z.object({
            status: z.enum(["proposed", "accepted"]).optional(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const list = await adrs.list(input.status);
        await recordAudit(agentId, name, summarize(args), summarize(list));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    // --- Event Stream ---
    if (name === "publish_event") {
        const input = z.object({
            type: z.string(),
            data: z.record(z.string(), z.any()),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const event = await eventStream.publish(input);
        await recordAudit(agentId, name, summarize(args), summarize(event));
        return { content: [{ type: "text", text: JSON.stringify(event, null, 2) }] };
    }

    if (name === "get_recent_events") {
        const input = z.object({
            limit: z.number().optional(),
            type: z.string().optional(),
            since: z.number().optional(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const list = await eventStream.list(input);
        await recordAudit(agentId, name, summarize(args), summarize(list));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    if (name === "subscribe_to_events") {
        const input = z.object({
            limit: z.number().optional(),
            type: z.string().optional(),
            since: z.number().optional(),
            timeoutMs: z.number().optional(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const result = await eventStream.waitForEvents(input);
        await recordAudit(agentId, name, summarize(args), summarize(result));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // --- Notifications ---
    if (name === "send_notification") {
        const input = z.object({
            title: z.string(),
            message: z.string(),
            priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const notification = await notifications.send(input);
        await recordAudit(agentId, name, summarize(args), summarize(notification));
        return { content: [{ type: "text", text: JSON.stringify(notification, null, 2) }] };
    }

    if (name === "list_notifications") {
        const input = z.object({
            limit: z.number().optional(),
            minPriority: z.enum(["low", "normal", "high", "urgent"]).optional(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const list = await notifications.list(input);
        await recordAudit(agentId, name, summarize(args), summarize(list));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    // --- Confidence Auction ---
    if (name === "resolve_confidence_auction") {
        const input = z.object({ bids: z.array(z.any()), agentId: z.string() }).parse(args);
        const agentId = await requireAgentId(input);
        const result = await confidenceAuction.resolve({ bids: input.bids });
        await recordAudit(agentId, name, summarize(args), summarize(result));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // --- Mood Log ---
    if (name === "log_mood") {
        const input = z.object({
            mood: z.string(),
            note: z.string().optional(),
            subjectAgentId: z.string().optional(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const entry = await moods.log({ agentId: input.subjectAgentId ?? agentId, mood: input.mood, note: input.note });
        await recordAudit(agentId, name, summarize(args), summarize(entry));
        return { content: [{ type: "text", text: JSON.stringify(entry, null, 2) }] };
    }

    if (name === "list_moods") {
        const input = z.object({
            limit: z.number().optional(),
            filterAgentId: z.string().optional(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const list = await moods.list({ agentId: input.filterAgentId, limit: input.limit });
        await recordAudit(agentId, name, summarize(args), summarize(list));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    // --- Arbitration ---
    if (name === "get_gavel_state") {
        const agentId = await requireAgentId(args);
        const state = await arbitration.getState();
        await recordAudit(agentId, name, summarize(args), summarize(state));
        return { content: [{ type: "text", text: JSON.stringify(state, null, 2) }] };
    }

    if (name === "request_gavel") {
        const agentId = await requireAgentId(args);
        const state = await arbitration.request(agentId);
        await recordAudit(agentId, name, summarize(args), summarize(state));
        return { content: [{ type: "text", text: JSON.stringify(state, null, 2) }] };
    }

    if (name === "grant_gavel") {
        const input = z.object({ targetAgentId: z.string(), agentId: z.string() }).parse(args);
        const agentId = await requireAgentId(input);
        const state = await arbitration.grant(input.targetAgentId);
        await recordAudit(agentId, name, summarize(args), summarize(state));
        return { content: [{ type: "text", text: JSON.stringify(state, null, 2) }] };
    }

    if (name === "release_gavel") {
        const agentId = await requireAgentId(args);
        const state = await arbitration.release();
        await recordAudit(agentId, name, summarize(args), summarize(state));
        return { content: [{ type: "text", text: JSON.stringify(state, null, 2) }] };
    }

    // --- Review Gate ---
    if (name === "submit_plan") {
        const input = z.object({ planId: z.string(), plan: z.string(), agentId: z.string() }).parse(args);
        const agentId = await requireAgentId(input);
        const gate = await reviewGates.submitPlan(input.planId, input.plan);
        await recordAudit(agentId, name, summarize(args), summarize(gate));
        return { content: [{ type: "text", text: JSON.stringify(gate, null, 2) }] };
    }

    if (name === "submit_critique") {
        const input = z.object({ planId: z.string(), critique: z.string(), agentId: z.string() }).parse(args);
        const agentId = await requireAgentId(input);
        const gate = await reviewGates.submitCritique(input.planId, input.critique);
        await recordAudit(agentId, name, summarize(args), summarize(gate));
        return { content: [{ type: "text", text: JSON.stringify(gate, null, 2) }] };
    }

    if (name === "approve_plan") {
        const input = z.object({ planId: z.string(), agentId: z.string() }).parse(args);
        const agentId = await requireAgentId(input);
        const gate = await reviewGates.approvePlan(input.planId);
        await recordAudit(agentId, name, summarize(args), summarize(gate));
        return { content: [{ type: "text", text: JSON.stringify(gate, null, 2) }] };
    }

    if (name === "get_review_gate") {
        const input = z.object({ planId: z.string(), agentId: z.string() }).parse(args);
        const agentId = await requireAgentId(input);
        const gate = await reviewGates.getGate(input.planId);
        await recordAudit(agentId, name, summarize(args), summarize(gate));
        return { content: [{ type: "text", text: JSON.stringify(gate, null, 2) }] };
    }

    if (name === "list_review_gates") {
        const input = z.object({
            status: z.enum(["pending", "critique_submitted", "approved"]).optional(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const list = await reviewGates.list(input.status);
        await recordAudit(agentId, name, summarize(args), summarize(list));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    // --- Messages ---
    if (name === "post_message") {
        const input = z.object({
            content: z.string(),
            sender: z.string(),
            metadata: z.record(z.string(), z.any()).optional(),
            channelId: z.string().optional(),
            threadId: z.string().optional(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const msg = await messages.post(input.sender, input.content, { 
            metadata: input.metadata, 
            channelId: input.channelId, 
            threadId: input.threadId 
        });
        await recordAudit(agentId, name, summarize(args), summarize(msg));
        return { content: [{ type: "text", text: JSON.stringify(msg, null, 2) }] };
    }

    if (name === "list_messages") {
        const input = z.object({
            limit: z.number().default(50),
            channelId: z.string().optional(),
            threadId: z.string().optional(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const list = await messages.list(input);
        await recordAudit(agentId, name, summarize(args), summarize(list));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }

    if (name === "wait_for_update") {
        const input = z.object({
            sinceRevision: z.number(),
            timeoutMs: z.number().default(30000),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const event = await messages.waitForUpdate(input.sinceRevision, input.timeoutMs);
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

    if (name === "get_sdd_report") {
        const agentId = await requireAgentId(args);
        const report = await sddTracking.getReport();
        await recordAudit(agentId, name, summarize(args), summarize(report));
        return { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] };
    }

    if (name === "scaffold_seam") {
        const input = z.object({
            seamName: z.string(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        // Note: scaffold_seam does not return a value in the current contract, but prints to stdout.
        // We'll return success if it doesn't throw.
        const result = await scaffolder.scaffold({ seamName: input.seamName, baseDir: process.cwd() });
        await recordAudit(agentId, name, summarize(args), summarize(result));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    if (name === "run_probe") {
        const input = z.object({
            pattern: z.string().optional(),
            agentId: z.string()
        }).parse(args);
        const agentId = await requireAgentId(input);
        const result = await probeRunner.run({ pattern: input.pattern ?? "" });
        await recordAudit(agentId, name, summarize(args), summarize(result));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err: unknown) {
    const error = err as any; // allowed-any
    const code = error.code || "UNKNOWN";
    const agentId = (args as any)?.agentId || "system"; // allowed-any
    await recordAudit(agentId, name, summarize(args), summarize({ error: error.message }), code);
    return {
      content: [{ type: "text", text: `ERROR [${code}]: ${error.message}` }],
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