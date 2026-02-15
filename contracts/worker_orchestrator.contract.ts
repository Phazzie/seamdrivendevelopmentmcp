import { z } from "zod";

export const WorkerModelSchema = z.enum(["codex_cli", "gemini_cli"]);
export type WorkerModel = z.infer<typeof WorkerModelSchema>;

export const WorkerRoleSchema = z.enum(["orchestrator", "writer", "reviewer", "tester", "researcher"]);
export type WorkerRole = z.infer<typeof WorkerRoleSchema>;

export const WorkerStatusSchema = z.enum(["idle", "busy", "stopped", "failed"]);
export type WorkerStatus = z.infer<typeof WorkerStatusSchema>;

export const WorkerDispatchStrategySchema = z.enum([
  "single_worker",
  "codex_writes_gemini_reviews",
  "gemini_writes_codex_reviews",
  "parallel_dual_write_review",
  "security_redteam_pass",
]);
export type WorkerDispatchStrategy = z.infer<typeof WorkerDispatchStrategySchema>;

export const WorkerRuntimeModeSchema = z.enum(["cli", "openai_sdk", "google_sdk"]);
export type WorkerRuntimeMode = z.infer<typeof WorkerRuntimeModeSchema>;

export const WorkerFallbackPolicySchema = z.enum(["never", "on_error"]);
export type WorkerFallbackPolicy = z.infer<typeof WorkerFallbackPolicySchema>;

export const WorkerRegistrationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(64),
  model: WorkerModelSchema,
  role: WorkerRoleSchema,
  runtimeMode: WorkerRuntimeModeSchema.default("cli"),
  status: WorkerStatusSchema,
  cwd: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  lastRunAt: z.number().int().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type WorkerRegistration = z.infer<typeof WorkerRegistrationSchema>;

export const WorkerRunStepSchema = z.object({
  workerId: z.string().uuid(),
  workerName: z.string(),
  model: WorkerModelSchema,
  runtimeMode: WorkerRuntimeModeSchema.default("cli"),
  runtimeModel: z.string().default("legacy"),
  fallbackFrom: WorkerRuntimeModeSchema.optional(),
  role: WorkerRoleSchema,
  prompt: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  exitCode: z.number().int().nullable(),
  durationMs: z.number().int().nonnegative(),
  timedOut: z.boolean(),
  stdout: z.string(),
  stderr: z.string(),
});
export type WorkerRunStep = z.infer<typeof WorkerRunStepSchema>;

export const WorkerRunStatusSchema = z.enum(["running", "completed", "failed"]);
export type WorkerRunStatus = z.infer<typeof WorkerRunStatusSchema>;

export const WorkerRunSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  strategy: WorkerDispatchStrategySchema,
  requestedRuntimeMode: WorkerRuntimeModeSchema.optional(),
  fallbackPolicy: WorkerFallbackPolicySchema.default("on_error"),
  status: WorkerRunStatusSchema,
  startedAt: z.number().int(),
  completedAt: z.number().int().optional(),
  summary: z.string().optional(),
  steps: z.array(WorkerRunStepSchema).default([]),
  error: z.string().optional(),
});
export type WorkerRun = z.infer<typeof WorkerRunSchema>;

export const SpawnWorkerInputSchema = z.object({
  name: z.string().min(2).max(64),
  model: WorkerModelSchema,
  role: WorkerRoleSchema.default("writer"),
  runtimeMode: WorkerRuntimeModeSchema.optional(),
  cwd: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type SpawnWorkerInput = z.input<typeof SpawnWorkerInputSchema>;

export const DispatchTaskInputSchema = z.object({
  taskId: z.string().uuid(),
  strategy: WorkerDispatchStrategySchema.default("single_worker"),
  workerId: z.string().uuid().optional(),
  reviewerWorkerId: z.string().uuid().optional(),
  runtimeMode: WorkerRuntimeModeSchema.optional(),
  fallbackPolicy: WorkerFallbackPolicySchema.default("on_error"),
  extraInstructions: z.string().optional(),
  timeoutMs: z.number().int().positive().max(10 * 60 * 1000).default(120000),
});
export type DispatchTaskInput = z.input<typeof DispatchTaskInputSchema>;

export const StopWorkerInputSchema = z.object({
  workerId: z.string().uuid(),
});
export type StopWorkerInput = z.infer<typeof StopWorkerInputSchema>;

export interface WorkerRuntimeInvocation {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  prompt: string;
  workerModel: WorkerModel;
  runtimeModel: string;
}

export interface WorkerRuntimeResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export interface IWorkerRuntime {
  readonly mode: WorkerRuntimeMode;
  createInvocation(
    model: WorkerModel,
    prompt: string,
    cwd: string,
    timeoutMs: number
  ): WorkerRuntimeInvocation;
  resolveModel(model: WorkerModel): string;
  run(invocation: WorkerRuntimeInvocation): Promise<WorkerRuntimeResult>;
}

export interface IWorkerOrchestrator {
  createWorker(input: SpawnWorkerInput): Promise<WorkerRegistration>;
  listWorkers(): Promise<WorkerRegistration[]>;
  stopWorker(input: StopWorkerInput): Promise<WorkerRegistration>;
  dispatchTask(input: DispatchTaskInput): Promise<WorkerRun>;
  listRuns(limit?: number): Promise<WorkerRun[]>;
}
