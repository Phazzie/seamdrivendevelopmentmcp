import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PathGuard } from "../../src/lib/helpers/path_guard.js";
import { JailedFs } from "../../src/lib/helpers/jailed_fs.js";
import { StoreAdapter } from "../../src/lib/adapters/store.adapter.js";
import { TaskAdapter } from "../../src/lib/adapters/tasks.adapter.js";
import { WorkerOrchestratorAdapter } from "../../src/lib/adapters/worker_orchestrator.adapter.js";
import { OrchestrationProvider } from "../../src/lib/providers/orchestration.provider.js";
import {
  IWorkerRuntime,
  WorkerModel,
  WorkerRuntimeInvocation,
  WorkerRuntimeResult,
} from "../../contracts/worker_orchestrator.contract.js";

class FakeRuntime implements IWorkerRuntime {
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
    };
  }

  async run(invocation: WorkerRuntimeInvocation): Promise<WorkerRuntimeResult> {
    return {
      exitCode: 0,
      stdout: `runtime:${invocation.command}`,
      stderr: "",
      durationMs: 12,
      timedOut: false,
    };
  }
}

describe("Worker Orchestrator Workflows (Real Store)", () => {
  it("runs writer/reviewer strategy through provider handlers", async () => {
    const root = process.cwd();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-worker-orch-"));
    try {
      const storePath = path.join(tempDir, "store.json");
      const pathGuard = new PathGuard(root, [tempDir]);
      const jailedFs = new JailedFs(root, [tempDir]);
      const store = new StoreAdapter(storePath, jailedFs);
      const tasks = new TaskAdapter(store);
      const orchestrator = new WorkerOrchestratorAdapter(store, new FakeRuntime(), pathGuard, root);
      const provider = new OrchestrationProvider(orchestrator);
      const handlers = provider.getHandlers();

      const task = await tasks.create(
        "Implement runtime guard",
        "Add strict worker orchestration path",
        undefined
      );

      const codex = await handlers.spawn_worker({
        name: "codex-writer-main",
        model: "codex_cli",
        role: "writer",
        cwd: path.join(root, "src"),
        agentId: "agent-1",
      });
      const gemini = await handlers.spawn_worker({
        name: "gemini-review-main",
        model: "gemini_cli",
        role: "reviewer",
        cwd: path.join(root, "src"),
        agentId: "agent-1",
      });

      const run = await handlers.dispatch_task({
        taskId: task.id,
        strategy: "codex_writes_gemini_reviews",
        workerId: codex.id,
        reviewerWorkerId: gemini.id,
        agentId: "agent-1",
      });
      assert.strictEqual(run.strategy, "codex_writes_gemini_reviews");
      assert.strictEqual(run.status, "completed");
      assert.strictEqual(run.steps.length, 2);

      const runs = await handlers.list_worker_runs({ limit: 10, agentId: "agent-1" });
      assert.ok(Array.isArray(runs));
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].id, run.id);
    } finally {
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
