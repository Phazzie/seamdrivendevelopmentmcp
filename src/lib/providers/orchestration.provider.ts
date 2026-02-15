import { z } from "zod";
import { IToolProvider, ToolHandler } from "../helpers/tool_registry.js";
import { WorkerOrchestratorAdapter } from "../adapters/worker_orchestrator.adapter.js";
import {
  WorkerFallbackPolicySchema,
  WorkerDispatchStrategySchema,
  WorkerModelSchema,
  WorkerRoleSchema,
  WorkerRuntimeModeSchema,
} from "../../../contracts/worker_orchestrator.contract.js";

/**
 * Purpose: Worker orchestration tool provider (worker_orchestrator seam).
 */
export class OrchestrationProvider implements IToolProvider {
  constructor(private readonly orchestrator: WorkerOrchestratorAdapter) {}

  getTools() {
    return [
      {
        name: "spawn_worker",
        description: "Register a headless CLI worker profile for orchestration. AI DIRECTIVE: Use unique names and explicit roles.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            model: { type: "string", enum: ["codex_cli", "gemini_cli"] },
            role: { type: "string", enum: ["orchestrator", "writer", "reviewer", "tester", "researcher"] },
            runtimeMode: { type: "string", enum: ["cli", "openai_sdk", "google_sdk"] },
            cwd: { type: "string" },
            metadata: { type: "object" },
            agentId: { type: "string" },
          },
          required: ["name", "model", "agentId"],
        },
      },
      {
        name: "list_workers",
        description: "List registered orchestration workers and statuses.",
        inputSchema: {
          type: "object",
          properties: { agentId: { type: "string" } },
          required: ["agentId"],
        },
      },
      {
        name: "stop_worker",
        description: "Stop a worker from further dispatch operations.",
        inputSchema: {
          type: "object",
          properties: { workerId: { type: "string" }, agentId: { type: "string" } },
          required: ["workerId", "agentId"],
        },
      },
      {
        name: "dispatch_task",
        description: "Dispatch a task using orchestration strategy (single, writer/reviewer, parallel compare, red-team security pass).",
        inputSchema: {
          type: "object",
          properties: {
            taskId: { type: "string" },
            strategy: {
              type: "string",
              enum: [
                "single_worker",
                "codex_writes_gemini_reviews",
                "gemini_writes_codex_reviews",
                "parallel_dual_write_review",
                "security_redteam_pass",
              ],
            },
            workerId: { type: "string" },
            reviewerWorkerId: { type: "string" },
            runtimeMode: { type: "string", enum: ["cli", "openai_sdk", "google_sdk"] },
            fallbackPolicy: { type: "string", enum: ["never", "on_error"] },
            extraInstructions: { type: "string" },
            timeoutMs: { type: "number" },
            agentId: { type: "string" },
          },
          required: ["taskId", "agentId"],
        },
      },
      {
        name: "list_worker_runs",
        description: "List recent worker dispatch runs for audit and debugging.",
        inputSchema: {
          type: "object",
          properties: { limit: { type: "number" }, agentId: { type: "string" } },
          required: ["agentId"],
        },
      },
    ];
  }

  getHandlers(): Record<string, ToolHandler> {
    return {
      spawn_worker: async (args) => {
        const input = z.object({
          name: z.string(),
          model: WorkerModelSchema,
          role: WorkerRoleSchema.optional(),
          runtimeMode: WorkerRuntimeModeSchema.optional(),
          cwd: z.string().optional(),
          metadata: z.record(z.string(), z.any()).optional(),
          agentId: z.string(),
        }).parse(args);
        return this.orchestrator.createWorker({
          name: input.name,
          model: input.model,
          role: input.role,
          runtimeMode: input.runtimeMode,
          cwd: input.cwd,
          metadata: input.metadata,
        });
      },
      list_workers: async (args) => {
        z.object({ agentId: z.string() }).parse(args);
        return this.orchestrator.listWorkers();
      },
      stop_worker: async (args) => {
        const input = z.object({ workerId: z.string(), agentId: z.string() }).parse(args);
        return this.orchestrator.stopWorker({ workerId: input.workerId });
      },
      dispatch_task: async (args) => {
        const input = z.object({
          taskId: z.string(),
          strategy: WorkerDispatchStrategySchema.optional(),
          workerId: z.string().optional(),
          reviewerWorkerId: z.string().optional(),
          runtimeMode: WorkerRuntimeModeSchema.optional(),
          fallbackPolicy: WorkerFallbackPolicySchema.optional(),
          extraInstructions: z.string().optional(),
          timeoutMs: z.number().optional(),
          agentId: z.string(),
        }).parse(args);
        return this.orchestrator.dispatchTask({
          taskId: input.taskId,
          strategy: input.strategy,
          workerId: input.workerId,
          reviewerWorkerId: input.reviewerWorkerId,
          runtimeMode: input.runtimeMode,
          fallbackPolicy: input.fallbackPolicy,
          extraInstructions: input.extraInstructions,
          timeoutMs: input.timeoutMs,
        });
      },
      list_worker_runs: async (args) => {
        const input = z.object({ limit: z.number().optional(), agentId: z.string() }).parse(args);
        return this.orchestrator.listRuns(input.limit);
      },
    };
  }
}
