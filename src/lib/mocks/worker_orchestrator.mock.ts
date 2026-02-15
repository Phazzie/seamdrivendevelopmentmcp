import { randomUUID } from "node:crypto";
import {
  DispatchTaskInput,
  DispatchTaskInputSchema,
  IWorkerOrchestrator,
  SpawnWorkerInput,
  SpawnWorkerInputSchema,
  StopWorkerInput,
  StopWorkerInputSchema,
  WorkerRegistration,
  WorkerRun,
} from "../../../contracts/worker_orchestrator.contract.js";
import { AppError } from "../../../contracts/store.contract.js";

/**
 * Purpose: Mock orchestration seam for deterministic contract testing.
 */
export class MockWorkerOrchestrator implements IWorkerOrchestrator {
  private workers: WorkerRegistration[] = [];
  private runs: WorkerRun[] = [];

  async createWorker(input: SpawnWorkerInput): Promise<WorkerRegistration> {
    const parsed = SpawnWorkerInputSchema.parse(input);
    if (this.workers.some((worker) => worker.name.toLowerCase() === parsed.name.toLowerCase())) {
      throw new AppError("VALIDATION_FAILED", `Worker name '${parsed.name}' already exists.`);
    }

    const now = Date.now();
    const worker: WorkerRegistration = {
      id: randomUUID(),
      name: parsed.name,
      model: parsed.model,
      role: parsed.role,
      runtimeMode: parsed.runtimeMode ?? "cli",
      status: "idle",
      cwd: parsed.cwd || "/mock",
      createdAt: now,
      updatedAt: now,
      metadata: parsed.metadata,
    };
    this.workers.push(worker);
    return { ...worker };
  }

  async listWorkers(): Promise<WorkerRegistration[]> {
    return this.workers.map((worker) => ({ ...worker }));
  }

  async stopWorker(input: StopWorkerInput): Promise<WorkerRegistration> {
    const parsed = StopWorkerInputSchema.parse(input);
    const idx = this.workers.findIndex((worker) => worker.id === parsed.workerId);
    if (idx === -1) throw new AppError("VALIDATION_FAILED", "Worker not found");
    const updated = { ...this.workers[idx], status: "stopped" as const, updatedAt: Date.now() };
    this.workers[idx] = updated;
    return { ...updated };
  }

  async dispatchTask(input: DispatchTaskInput): Promise<WorkerRun> {
    const parsed = DispatchTaskInputSchema.parse(input);

    let selected = this.workers.find((worker) => worker.id === parsed.workerId);
    if (!selected) {
      selected = this.workers.find((worker) => worker.status === "idle");
    }
    if (!selected) {
      throw new AppError("VALIDATION_FAILED", "No available workers.");
    }
    if (selected.status === "stopped") {
      throw new AppError("VALIDATION_FAILED", "Worker not found");
    }

    const now = Date.now();
    const run: WorkerRun = {
      id: randomUUID(),
      taskId: parsed.taskId,
      strategy: parsed.strategy,
      requestedRuntimeMode: parsed.runtimeMode,
      fallbackPolicy: parsed.fallbackPolicy,
      status: "completed",
      startedAt: now,
      completedAt: now + 1,
      summary: "Mock run completed.",
      steps: [
        {
          workerId: selected.id,
          workerName: selected.name,
          model: selected.model,
          runtimeMode: selected.runtimeMode,
          runtimeModel: selected.model === "codex_cli" ? "gpt-5.2-codex" : "gemini-2.5-flash",
          role: selected.role,
          prompt: `Mock prompt for ${parsed.taskId}`,
          command: selected.model === "codex_cli" ? "codex" : "gemini",
          args: [],
          exitCode: 0,
          durationMs: 1,
          timedOut: false,
          stdout: `Mock output for strategy ${parsed.strategy}`,
          stderr: "",
        },
      ],
    };
    this.runs.push(run);
    return { ...run, steps: run.steps.map((step) => ({ ...step })) };
  }

  async listRuns(limit = 20): Promise<WorkerRun[]> {
    return this.runs
      .slice(-Math.max(1, limit))
      .reverse()
      .map((run) => ({ ...run, steps: run.steps.map((step) => ({ ...step })) }));
  }
}
