import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { MockWorkerOrchestrator } from "../../src/lib/mocks/worker_orchestrator.mock.js";
import { WorkerOrchestratorAdapter } from "../../src/lib/adapters/worker_orchestrator.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";
import { PathGuard } from "../../src/lib/helpers/path_guard.js";
import {
  IWorkerOrchestrator,
  IWorkerRuntime,
  WorkerModel,
  WorkerRuntimeMode,
  WorkerRuntimeInvocation,
  WorkerRuntimeResult,
} from "../../contracts/worker_orchestrator.contract.js";

const TASK_ID = "11111111-1111-4111-8111-111111111111";

class FakeRuntime implements IWorkerRuntime {
  readonly mode = "cli" as const;

  createInvocation(
    model: WorkerModel,
    prompt: string,
    cwd: string,
    timeoutMs: number
  ): WorkerRuntimeInvocation {
    return {
      command: model === "codex_cli" ? "codex" : "gemini",
      args: ["--prompt", prompt],
      cwd,
      timeoutMs,
      prompt,
      workerModel: model,
      runtimeModel: this.resolveModel(model),
    };
  }

  resolveModel(model: WorkerModel): string {
    return model === "codex_cli" ? "gpt-5.2-codex" : "gemini-2.5-flash";
  }

  async run(invocation: WorkerRuntimeInvocation): Promise<WorkerRuntimeResult> {
    return {
      exitCode: 0,
      stdout: `ok:${invocation.command}`,
      stderr: "",
      durationMs: 5,
      timedOut: false,
    };
  }
}

class ConfigurableRuntime implements IWorkerRuntime {
  constructor(
    readonly mode: WorkerRuntimeMode,
    private readonly exitCode: number,
    private readonly stdoutPrefix: string
  ) {}

  createInvocation(
    model: WorkerModel,
    prompt: string,
    cwd: string,
    timeoutMs: number
  ): WorkerRuntimeInvocation {
    return {
      command: `${this.mode}.run`,
      args: ["--prompt", prompt],
      cwd,
      timeoutMs,
      prompt,
      workerModel: model,
      runtimeModel: this.resolveModel(model),
    };
  }

  resolveModel(model: WorkerModel): string {
    if (this.mode === "openai_sdk") return "gpt-5.2-codex";
    if (this.mode === "google_sdk") return "gemini-2.5-flash";
    return model === "codex_cli" ? "gpt-5.2-codex" : "gemini-2.5-flash";
  }

  async run(invocation: WorkerRuntimeInvocation): Promise<WorkerRuntimeResult> {
    return {
      exitCode: this.exitCode,
      stdout: `${this.stdoutPrefix}:${invocation.command}`,
      stderr: this.exitCode === 0 ? "" : `${this.mode} failed`,
      durationMs: 7,
      timedOut: false,
    };
  }
}

function runWorkerOrchestratorContract(createSeam: () => Promise<IWorkerOrchestrator>) {
  describe("Worker Orchestrator Contract", () => {
    let seam: IWorkerOrchestrator;

    beforeEach(async () => {
      seam = await createSeam();
    });

    it("spawns workers and lists them", async () => {
      const worker = await seam.createWorker({
        name: "codex-writer-1",
        model: "codex_cli",
        role: "writer",
      });
      const list = await seam.listWorkers();
      assert.ok(worker.id);
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0].name, "codex-writer-1");
    });

    it("stops a worker", async () => {
      const worker = await seam.createWorker({
        name: "gemini-review-1",
        model: "gemini_cli",
        role: "reviewer",
      });
      const stopped = await seam.stopWorker({ workerId: worker.id });
      assert.strictEqual(stopped.status, "stopped");
    });

    it("dispatches a task and records run history", async () => {
      const worker = await seam.createWorker({
        name: "codex-writer-2",
        model: "codex_cli",
        role: "writer",
      });
      const run = await seam.dispatchTask({
        taskId: TASK_ID,
        strategy: "single_worker",
        workerId: worker.id,
      });
      assert.strictEqual(run.taskId, TASK_ID);
      assert.ok(run.steps.length >= 1);

      const runs = await seam.listRuns(10);
      assert.ok(runs.length >= 1);
      assert.strictEqual(runs[0].taskId, TASK_ID);
    });
  });
}

describe("MockWorkerOrchestrator", () => {
  runWorkerOrchestratorContract(async () => new MockWorkerOrchestrator());
});

describe("WorkerOrchestratorAdapter", () => {
  runWorkerOrchestratorContract(async () => {
    const root = process.cwd();
    const pathGuard = new PathGuard(root, [os.tmpdir()]);
    const store = new MockStore(undefined, {
      tasks: [
        {
          id: TASK_ID,
          title: "Implement seam",
          description: "Build orchestration flow",
          status: "todo",
          blockedBy: [],
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ],
    });

    return new WorkerOrchestratorAdapter(store, { cli: new FakeRuntime() }, pathGuard, root);
  });

  it("executes codex->gemini writer/reviewer strategy with two steps", async () => {
    const root = process.cwd();
    const pathGuard = new PathGuard(root, [os.tmpdir()]);
    const store = new MockStore(undefined, {
      tasks: [
        {
          id: TASK_ID,
          title: "Add API validation",
          description: "Implement and review runtime safety",
          status: "todo",
          blockedBy: [],
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ],
    });
    const seam = new WorkerOrchestratorAdapter(store, { cli: new FakeRuntime() }, pathGuard, root);

    await seam.createWorker({ name: "codex-writer", model: "codex_cli", role: "writer", cwd: path.join(root, "src") });
    await seam.createWorker({ name: "gemini-reviewer", model: "gemini_cli", role: "reviewer", cwd: path.join(root, "src") });

    const run = await seam.dispatchTask({
      taskId: TASK_ID,
      strategy: "codex_writes_gemini_reviews",
    });
    assert.strictEqual(run.steps.length, 2);
    assert.strictEqual(run.status, "completed");
  });

  it("falls back from sdk runtime to cli when policy is on_error", async () => {
    const root = process.cwd();
    const pathGuard = new PathGuard(root, [os.tmpdir()]);
    const store = new MockStore(undefined, {
      tasks: [
        {
          id: TASK_ID,
          title: "Fallback flow",
          description: "Ensure sdk to cli fallback",
          status: "todo",
          blockedBy: [],
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ],
    });
    const seam = new WorkerOrchestratorAdapter(
      store,
      {
        cli: new ConfigurableRuntime("cli", 0, "cli-ok"),
        openai_sdk: new ConfigurableRuntime("openai_sdk", 1, "openai-fail"),
      },
      pathGuard,
      root
    );

    const worker = await seam.createWorker({ name: "writer-openai", model: "codex_cli", role: "writer", cwd: path.join(root, "src") });
    const run = await seam.dispatchTask({
      taskId: TASK_ID,
      strategy: "single_worker",
      workerId: worker.id,
      runtimeMode: "openai_sdk",
      fallbackPolicy: "on_error",
    });

    assert.strictEqual(run.status, "completed");
    assert.strictEqual(run.fallbackPolicy, "on_error");
    assert.strictEqual(run.requestedRuntimeMode, "openai_sdk");
    assert.strictEqual(run.steps[0].runtimeMode, "cli");
    assert.strictEqual(run.steps[0].fallbackFrom, "openai_sdk");
  });

  it("does not fallback when policy is never", async () => {
    const root = process.cwd();
    const pathGuard = new PathGuard(root, [os.tmpdir()]);
    const store = new MockStore(undefined, {
      tasks: [
        {
          id: TASK_ID,
          title: "No fallback flow",
          description: "Keep failing runtime when fallback disabled",
          status: "todo",
          blockedBy: [],
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ],
    });
    const seam = new WorkerOrchestratorAdapter(
      store,
      {
        cli: new ConfigurableRuntime("cli", 0, "cli-ok"),
        openai_sdk: new ConfigurableRuntime("openai_sdk", 1, "openai-fail"),
      },
      pathGuard,
      root
    );

    const worker = await seam.createWorker({ name: "writer-openai-nofallback", model: "codex_cli", role: "writer", cwd: path.join(root, "src") });
    const run = await seam.dispatchTask({
      taskId: TASK_ID,
      strategy: "single_worker",
      workerId: worker.id,
      runtimeMode: "openai_sdk",
      fallbackPolicy: "never",
    });

    assert.strictEqual(run.status, "failed");
    assert.strictEqual(run.steps[0].runtimeMode, "openai_sdk");
    assert.strictEqual(run.steps[0].fallbackFrom, undefined);
  });
});
