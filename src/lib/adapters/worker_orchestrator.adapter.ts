import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Task } from "../../../contracts/tasks.contract.js";
import {
  DispatchTaskInput,
  DispatchTaskInputSchema,
  WorkerFallbackPolicy,
  IWorkerOrchestrator,
  IWorkerRuntime,
  SpawnWorkerInput,
  SpawnWorkerInputSchema,
  StopWorkerInput,
  StopWorkerInputSchema,
  WorkerDispatchStrategy,
  WorkerRegistration,
  WorkerRegistrationSchema,
  WorkerRole,
  WorkerRun,
  WorkerRunSchema,
  WorkerRunStep,
  WorkerRunStepSchema,
  WorkerRuntimeMode,
} from "../../../contracts/worker_orchestrator.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import type { IStore, PersistedStore } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";
import { PathGuard } from "../helpers/path_guard.js";

type StrategyPlan = {
  workers: WorkerRegistration[];
  run: (task: Task, timeoutMs: number, extraInstructions?: string) => Promise<WorkerRunStep[]>;
};

/**
 * Purpose: Real orchestration engine for headless worker CLIs (worker_orchestrator seam).
 * Hardened: strict worker selection and jailed cwd validation.
 */
export class WorkerOrchestratorAdapter implements IWorkerOrchestrator {
  constructor(
    private readonly store: IStore,
    private readonly runtimes: Partial<Record<WorkerRuntimeMode, IWorkerRuntime>>,
    private readonly pathGuard: PathGuard,
    private readonly defaultCwd: string,
    private readonly defaultRuntimeMode: WorkerRuntimeMode = "cli"
  ) {}

  async createWorker(input: SpawnWorkerInput): Promise<WorkerRegistration> {
    const parsed = SpawnWorkerInputSchema.parse(input);
    const safeCwd = await this.resolveWorkerCwd(parsed.cwd);

    return runTransaction(this.store, (current) => {
      const workers = this.readWorkers(current);
      const duplicate = workers.find((worker) => worker.name.toLowerCase() === parsed.name.toLowerCase());
      if (duplicate) {
        throw new AppError("VALIDATION_FAILED", `Worker name '${parsed.name}' already exists.`);
      }

      const now = Date.now();
      const worker: WorkerRegistration = {
        id: randomUUID(),
        name: parsed.name,
        model: parsed.model,
        role: parsed.role,
        runtimeMode: parsed.runtimeMode ?? this.defaultRuntimeMode,
        status: "idle",
        cwd: safeCwd,
        createdAt: now,
        updatedAt: now,
        metadata: parsed.metadata,
      };

      return {
        nextState: { ...current, workers: [...workers, worker] },
        result: worker,
      };
    });
  }

  async listWorkers(): Promise<WorkerRegistration[]> {
    const current = await this.store.load();
    return this.readWorkers(current).sort((a, b) => a.createdAt - b.createdAt);
  }

  async stopWorker(input: StopWorkerInput): Promise<WorkerRegistration> {
    const parsed = StopWorkerInputSchema.parse(input);
    return runTransaction(this.store, (current) => {
      const workers = this.readWorkers(current);
      const idx = workers.findIndex((worker) => worker.id === parsed.workerId);
      if (idx === -1) {
        throw new AppError("VALIDATION_FAILED", "Worker not found");
      }

      const now = Date.now();
      const updated: WorkerRegistration = {
        ...workers[idx],
        status: "stopped",
        updatedAt: now,
      };
      const next = [...workers];
      next[idx] = updated;

      return {
        nextState: { ...current, workers: next },
        result: updated,
      };
    });
  }

  async dispatchTask(input: DispatchTaskInput): Promise<WorkerRun> {
    const parsed = DispatchTaskInputSchema.parse(input);
    const snapshot = await this.store.load();
    const task = this.readTask(snapshot, parsed.taskId);
    const plan = this.buildStrategyPlan(snapshot, parsed);
    const runId = randomUUID();
    const now = Date.now();

    await this.reserveRunAndWorkers(
      runId,
      plan.workers,
      task.id,
      parsed.strategy,
      now,
      parsed.runtimeMode,
      parsed.fallbackPolicy
    );

    let steps: WorkerRunStep[] = [];
    let status: WorkerRun["status"] = "completed";
    let errorMessage: string | undefined;

    try {
      steps = await plan.run(task, parsed.timeoutMs, parsed.extraInstructions);
      if (steps.some((step) => !this.stepSucceeded(step))) {
        status = "failed";
        errorMessage = "One or more worker steps failed.";
      }
    } catch (err: unknown) {
      status = "failed";
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    return this.finalizeRun(runId, plan.workers, steps, status, errorMessage);
  }

  async listRuns(limit = 20): Promise<WorkerRun[]> {
    const current = await this.store.load();
    const runs = this.readRuns(current).sort((a, b) => b.startedAt - a.startedAt);
    return runs.slice(0, Math.max(1, limit));
  }

  private async reserveRunAndWorkers(
    runId: string,
    selectedWorkers: WorkerRegistration[],
    taskId: string,
    strategy: WorkerDispatchStrategy,
    startedAt: number,
    requestedRuntimeMode?: WorkerRuntimeMode,
    fallbackPolicy: WorkerFallbackPolicy = "on_error"
  ): Promise<void> {
    await runTransaction(this.store, (current) => {
      const workers = this.readWorkers(current);
      const runs = this.readRuns(current);
      const selectedIds = new Set(selectedWorkers.map((worker) => worker.id));
      const reservedWorkers = workers.map((worker) => {
        if (!selectedIds.has(worker.id)) return worker;
        if (worker.status === "stopped") {
          throw new AppError("VALIDATION_FAILED", `Worker '${worker.name}' is stopped.`);
        }
        if (worker.status === "busy") {
          throw new AppError("LOCKED", `Worker '${worker.name}' is already busy.`);
        }
        return {
          ...worker,
          status: "busy" as const,
          updatedAt: Date.now(),
        };
      });

      const run: WorkerRun = {
        id: runId,
        taskId,
        strategy,
        requestedRuntimeMode,
        fallbackPolicy,
        status: "running",
        startedAt,
        steps: [],
      };

      return {
        nextState: {
          ...current,
          workers: reservedWorkers,
          worker_runs: [...runs, run],
        },
        result: undefined,
      };
    }, "Failed to reserve workers for run");
  }

  private async finalizeRun(
    runId: string,
    selectedWorkers: WorkerRegistration[],
    steps: WorkerRunStep[],
    status: WorkerRun["status"],
    errorMessage?: string
  ): Promise<WorkerRun> {
    return runTransaction(this.store, (current) => {
      const workers = this.readWorkers(current);
      const runs = this.readRuns(current);
      const now = Date.now();
      const failedWorkers = new Set(
        steps.filter((step) => !this.stepSucceeded(step)).map((step) => step.workerId)
      );
      const selectedIds = new Set(selectedWorkers.map((worker) => worker.id));

      const nextWorkers = workers.map((worker) => {
        if (!selectedIds.has(worker.id)) return worker;
        const nextStatus: WorkerRegistration["status"] = failedWorkers.has(worker.id) ? "failed" : "idle";
        return {
          ...worker,
          status: nextStatus,
          lastRunAt: now,
          updatedAt: now,
        };
      });

      const runIdx = runs.findIndex((run) => run.id === runId);
      if (runIdx === -1) {
        throw new AppError("INTERNAL_ERROR", `Worker run ${runId} not found`);
      }

      const summary = this.buildSummary(steps, status, errorMessage);
      const updatedRun: WorkerRun = {
        ...runs[runIdx],
        steps,
        status,
        completedAt: now,
        summary,
        error: errorMessage,
      };
      const nextRuns = [...runs];
      nextRuns[runIdx] = updatedRun;

      return {
        nextState: { ...current, workers: nextWorkers, worker_runs: nextRuns },
        result: updatedRun,
      };
    }, "Failed to finalize worker run");
  }

  private buildStrategyPlan(current: PersistedStore, input: DispatchTaskInput): StrategyPlan {
    const workers = this.readWorkers(current);
    const available = workers.filter((worker) => worker.status !== "stopped");
    const byId = new Map(available.map((worker) => [worker.id, worker]));

    const pickByModel = (model: WorkerRegistration["model"], role?: WorkerRole): WorkerRegistration => {
      const candidate = available.find((worker) => {
        if (worker.model !== model) return false;
        if (role && worker.role !== role) return false;
        return worker.status === "idle";
      }) || available.find((worker) => {
        if (worker.model !== model) return false;
        if (role && worker.role !== role) return false;
        return true;
      });
      if (!candidate) {
        throw new AppError("VALIDATION_FAILED", `No available worker for model '${model}'${role ? ` and role '${role}'` : ""}.`);
      }
      return candidate;
    };

    const pickById = (id: string | undefined): WorkerRegistration => {
      if (!id) throw new AppError("VALIDATION_FAILED", "Required workerId missing.");
      const worker = byId.get(id);
      if (!worker) throw new AppError("VALIDATION_FAILED", `Worker '${id}' not found.`);
      return worker;
    };

    const runSingle = async (worker: WorkerRegistration, task: Task, timeoutMs: number, extraInstructions?: string) => {
      const prompt = this.buildSingleWorkerPrompt(task, worker, extraInstructions);
      const step = await this.runStep(worker, worker.role, prompt, timeoutMs, input.runtimeMode, input.fallbackPolicy);
      return [step];
    };

    if (input.strategy === "single_worker") {
      const selected = input.workerId
        ? pickById(input.workerId)
        : available.find((worker) => worker.status === "idle") || available[0];
      if (!selected) {
        throw new AppError("VALIDATION_FAILED", "No available workers registered.");
      }
      return {
        workers: [selected],
        run: async (task, timeoutMs, extraInstructions) => runSingle(selected, task, timeoutMs, extraInstructions),
      };
    }

    if (input.strategy === "codex_writes_gemini_reviews") {
      const writer = input.workerId ? pickById(input.workerId) : pickByModel("codex_cli", "writer");
      const reviewer = input.reviewerWorkerId ? pickById(input.reviewerWorkerId) : pickByModel("gemini_cli", "reviewer");
      return {
        workers: uniqueWorkers(writer, reviewer),
        run: async (task, timeoutMs, extraInstructions) => {
          const writerPrompt = this.buildWriterPrompt(task, writer, extraInstructions);
          const writerStep = await this.runStep(writer, "writer", writerPrompt, timeoutMs, input.runtimeMode, input.fallbackPolicy);
          const reviewerPrompt = this.buildReviewerPrompt(task, reviewer, writerStep.stdout, "focus on correctness, test gaps, and security");
          const reviewerStep = await this.runStep(reviewer, "reviewer", reviewerPrompt, timeoutMs, input.runtimeMode, input.fallbackPolicy);
          return [writerStep, reviewerStep];
        },
      };
    }

    if (input.strategy === "gemini_writes_codex_reviews") {
      const writer = input.workerId ? pickById(input.workerId) : pickByModel("gemini_cli", "writer");
      const reviewer = input.reviewerWorkerId ? pickById(input.reviewerWorkerId) : pickByModel("codex_cli", "reviewer");
      return {
        workers: uniqueWorkers(writer, reviewer),
        run: async (task, timeoutMs, extraInstructions) => {
          const writerPrompt = this.buildWriterPrompt(task, writer, extraInstructions);
          const writerStep = await this.runStep(writer, "writer", writerPrompt, timeoutMs, input.runtimeMode, input.fallbackPolicy);
          const reviewerPrompt = this.buildReviewerPrompt(task, reviewer, writerStep.stdout, "focus on regressions, architecture quality, and release risk");
          const reviewerStep = await this.runStep(reviewer, "reviewer", reviewerPrompt, timeoutMs, input.runtimeMode, input.fallbackPolicy);
          return [writerStep, reviewerStep];
        },
      };
    }

    if (input.strategy === "parallel_dual_write_review") {
      const codexWriter = pickByModel("codex_cli", "writer");
      const geminiWriter = pickByModel("gemini_cli", "writer");
      const reviewer = input.reviewerWorkerId
        ? pickById(input.reviewerWorkerId)
        : available.find((worker) => worker.role === "reviewer" && worker.status === "idle") ||
          available.find((worker) => worker.role === "reviewer");
      if (!reviewer) {
        throw new AppError("VALIDATION_FAILED", "No reviewer worker available for parallel strategy.");
      }

      return {
        workers: uniqueWorkers(codexWriter, geminiWriter, reviewer),
        run: async (task, timeoutMs, extraInstructions) => {
          const codexPrompt = this.buildWriterPrompt(task, codexWriter, extraInstructions);
          const geminiPrompt = this.buildWriterPrompt(task, geminiWriter, extraInstructions);
          const [codexStep, geminiStep] = await Promise.all([
            this.runStep(codexWriter, "writer", codexPrompt, timeoutMs, input.runtimeMode, input.fallbackPolicy),
            this.runStep(geminiWriter, "writer", geminiPrompt, timeoutMs, input.runtimeMode, input.fallbackPolicy),
          ]);
          const reviewPayload = [
            "Candidate A (Codex):",
            codexStep.stdout,
            "",
            "Candidate B (Gemini):",
            geminiStep.stdout,
          ].join("\n");
          const reviewerPrompt = this.buildReviewerPrompt(task, reviewer, reviewPayload, "pick the stronger approach, cite risks, and propose a merged final patch plan");
          const reviewerStep = await this.runStep(reviewer, "reviewer", reviewerPrompt, timeoutMs, input.runtimeMode, input.fallbackPolicy);
          return [codexStep, geminiStep, reviewerStep];
        },
      };
    }

    if (input.strategy === "security_redteam_pass") {
      const writer = input.workerId
        ? pickById(input.workerId)
        : available.find((worker) => worker.role === "writer" && worker.status === "idle") || available[0];
      if (!writer) {
        throw new AppError("VALIDATION_FAILED", "No writer worker available.");
      }
      const redTeamReviewer = input.reviewerWorkerId
        ? pickById(input.reviewerWorkerId)
        : available.find((worker) => worker.id !== writer.id && worker.role === "reviewer" && worker.status === "idle") ||
          available.find((worker) => worker.id !== writer.id && worker.role === "reviewer");
      if (!redTeamReviewer) {
        throw new AppError("VALIDATION_FAILED", "No reviewer worker available for red-team pass.");
      }

      return {
        workers: uniqueWorkers(writer, redTeamReviewer),
        run: async (task, timeoutMs, extraInstructions) => {
          const writerPrompt = this.buildWriterPrompt(task, writer, extraInstructions);
          const writerStep = await this.runStep(writer, "writer", writerPrompt, timeoutMs, input.runtimeMode, input.fallbackPolicy);
          const redTeamPrompt = this.buildReviewerPrompt(
            task,
            redTeamReviewer,
            writerStep.stdout,
            "perform a hostile security review: path traversal, command injection, race conditions, and data corruption scenarios"
          );
          const reviewerStep = await this.runStep(
            redTeamReviewer,
            "reviewer",
            redTeamPrompt,
            timeoutMs,
            input.runtimeMode,
            input.fallbackPolicy
          );
          return [writerStep, reviewerStep];
        },
      };
    }

    throw new AppError("VALIDATION_FAILED", `Unsupported strategy: ${input.strategy}`);
  }

  private async runStep(
    worker: WorkerRegistration,
    role: WorkerRole,
    prompt: string,
    timeoutMs: number,
    requestedRuntimeMode?: WorkerRuntimeMode,
    fallbackPolicy: WorkerFallbackPolicy = "on_error"
  ): Promise<WorkerRunStep> {
    const selectedMode = requestedRuntimeMode ?? worker.runtimeMode ?? this.defaultRuntimeMode;
    const primary = this.getRuntime(selectedMode);
    const fallback = this.getRuntime("cli");
    if (!primary) {
      if (selectedMode !== "cli" && fallbackPolicy === "on_error" && fallback) {
        const fallbackInvocation = fallback.createInvocation(worker.model, prompt, worker.cwd, timeoutMs);
        const fallbackResult = await fallback.run(fallbackInvocation);
        return WorkerRunStepSchema.parse({
          workerId: worker.id,
          workerName: worker.name,
          model: worker.model,
          runtimeMode: "cli",
          runtimeModel: fallbackInvocation.runtimeModel,
          fallbackFrom: selectedMode,
          role,
          prompt,
          command: fallbackInvocation.command,
          args: fallbackInvocation.args,
          exitCode: fallbackResult.exitCode,
          durationMs: fallbackResult.durationMs,
          timedOut: fallbackResult.timedOut,
          stdout: fallbackResult.stdout,
          stderr: `Runtime mode '${selectedMode}' is not available.\n${fallbackResult.stderr}`.trim(),
        });
      }
      throw new AppError("VALIDATION_FAILED", `Runtime mode '${selectedMode}' is not available.`);
    }

    const primaryInvocation = primary.createInvocation(worker.model, prompt, worker.cwd, timeoutMs);
    const primaryResult = await primary.run(primaryInvocation);
    const canFallback =
      fallbackPolicy === "on_error" &&
      selectedMode !== "cli" &&
      fallback &&
      (primaryResult.exitCode !== 0 || primaryResult.timedOut);

    if (!canFallback) {
      return WorkerRunStepSchema.parse({
        workerId: worker.id,
        workerName: worker.name,
        model: worker.model,
        runtimeMode: selectedMode,
        runtimeModel: primaryInvocation.runtimeModel,
        role,
        prompt,
        command: primaryInvocation.command,
        args: primaryInvocation.args,
        exitCode: primaryResult.exitCode,
        durationMs: primaryResult.durationMs,
        timedOut: primaryResult.timedOut,
        stdout: primaryResult.stdout,
        stderr: primaryResult.stderr,
      });
    }

    const fallbackInvocation = fallback.createInvocation(worker.model, prompt, worker.cwd, timeoutMs);
    const fallbackResult = await fallback.run(fallbackInvocation);
    const combinedStderr = [primaryResult.stderr, `Fallback from runtime '${selectedMode}' to 'cli'.`]
      .filter((chunk) => chunk && chunk.length > 0)
      .join("\n");

    return WorkerRunStepSchema.parse({
      workerId: worker.id,
      workerName: worker.name,
      model: worker.model,
      runtimeMode: "cli",
      runtimeModel: fallbackInvocation.runtimeModel,
      fallbackFrom: selectedMode,
      role,
      prompt,
      command: fallbackInvocation.command,
      args: fallbackInvocation.args,
      exitCode: fallbackResult.exitCode,
      durationMs: primaryResult.durationMs + fallbackResult.durationMs,
      timedOut: fallbackResult.timedOut,
      stdout: fallbackResult.stdout,
      stderr: [combinedStderr, fallbackResult.stderr].filter((chunk) => chunk && chunk.length > 0).join("\n"),
    });
  }

  private getRuntime(mode: WorkerRuntimeMode): IWorkerRuntime | undefined {
    return this.runtimes[mode];
  }

  private buildSingleWorkerPrompt(task: Task, worker: WorkerRegistration, extraInstructions?: string): string {
    return [
      `You are ${worker.name} (${worker.model}) with role ${worker.role}.`,
      `Task ID: ${task.id}`,
      `Title: ${task.title}`,
      `Description: ${task.description}`,
      extraInstructions ? `Extra instructions: ${extraInstructions}` : "",
      "Return a concise delivery output with technical steps and concrete decisions.",
    ].filter(Boolean).join("\n");
  }

  private buildWriterPrompt(task: Task, worker: WorkerRegistration, extraInstructions?: string): string {
    return [
      `You are ${worker.name} (${worker.model}) acting as a senior implementation engineer.`,
      `Task ID: ${task.id}`,
      `Title: ${task.title}`,
      `Description: ${task.description}`,
      extraInstructions ? `Extra instructions: ${extraInstructions}` : "",
      "Produce implementation-ready output: approach, key diffs, test plan, and risk notes.",
    ].filter(Boolean).join("\n");
  }

  private buildReviewerPrompt(
    task: Task,
    worker: WorkerRegistration,
    candidateOutput: string,
    emphasis: string
  ): string {
    return [
      `You are ${worker.name} (${worker.model}) acting as a strict code reviewer.`,
      `Review emphasis: ${emphasis}`,
      `Task ID: ${task.id}`,
      `Title: ${task.title}`,
      `Description: ${task.description}`,
      "Candidate output to review:",
      candidateOutput,
      "Return findings ordered by severity and include actionable corrections.",
    ].join("\n");
  }

  private readTask(current: PersistedStore, taskId: string): Task {
    const tasks = z.array(z.any()).parse(current.tasks) as Task[];
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) {
      throw new AppError("VALIDATION_FAILED", `Task ${taskId} not found.`);
    }
    return task;
  }

  private readWorkers(current: PersistedStore): WorkerRegistration[] {
    return z.array(WorkerRegistrationSchema).parse(current.workers ?? []);
  }

  private readRuns(current: PersistedStore): WorkerRun[] {
    return z.array(WorkerRunSchema).parse(current.worker_runs ?? []);
  }

  private stepSucceeded(step: WorkerRunStep): boolean {
    return !step.timedOut && step.exitCode === 0;
  }

  private buildSummary(steps: WorkerRunStep[], status: WorkerRun["status"], errorMessage?: string): string {
    const succeeded = steps.filter((step) => this.stepSucceeded(step)).length;
    const failed = steps.length - succeeded;
    const errorSuffix = errorMessage ? ` Error: ${errorMessage}` : "";
    return `Run ${status}. Steps: ${steps.length}, succeeded: ${succeeded}, failed: ${failed}.${errorSuffix}`;
  }

  private async resolveWorkerCwd(candidate?: string): Promise<string> {
    const base = candidate && candidate.trim().length > 0 ? candidate : this.defaultCwd;
    return this.pathGuard.validate(base);
  }
}

function uniqueWorkers(...workers: WorkerRegistration[]): WorkerRegistration[] {
  const seen = new Set<string>();
  const output: WorkerRegistration[] = [];
  for (const worker of workers) {
    if (seen.has(worker.id)) continue;
    seen.add(worker.id);
    output.push(worker);
  }
  return output;
}
