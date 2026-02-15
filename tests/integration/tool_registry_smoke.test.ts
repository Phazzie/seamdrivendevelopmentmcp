import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import os from "os";
import path from "path";
import { ToolRegistry } from "../../src/lib/helpers/tool_registry.js";
import { PathGuard } from "../../src/lib/helpers/path_guard.js";
import { JailedFs } from "../../src/lib/helpers/jailed_fs.js";
import { StoreAdapter } from "../../src/lib/adapters/store.adapter.js";
import { TaskAdapter } from "../../src/lib/adapters/tasks.adapter.js";
import { DependencyAdapter } from "../../src/lib/adapters/dependency.adapter.js";
import { SchedulerAdapter } from "../../src/lib/adapters/scheduler.adapter.js";
import { KnowledgeAdapter } from "../../src/lib/adapters/knowledge.adapter.js";
import { AdrAdapter } from "../../src/lib/adapters/adr.adapter.js";
import { IdeaAdapter } from "../../src/lib/adapters/ideas.adapter.js";
import { LockerAdapter } from "../../src/lib/adapters/locker.adapter.js";
import { AgentAdapter } from "../../src/lib/adapters/agents.adapter.js";
import { StatusAdapter } from "../../src/lib/adapters/status.adapter.js";
import { AuditAdapter } from "../../src/lib/adapters/audit.adapter.js";
import { MessageAdapter } from "../../src/lib/adapters/messages.adapter.js";
import { EventStreamAdapter } from "../../src/lib/adapters/event_stream.adapter.js";
import { NotificationAdapter } from "../../src/lib/adapters/notifications.adapter.js";
import { ReviewGateAdapter } from "../../src/lib/adapters/review_gate.adapter.js";
import { ArbitrationAdapter } from "../../src/lib/adapters/arbitration.adapter.js";
import { MoodAdapter } from "../../src/lib/adapters/mood.adapter.js";
import { ConfidenceAuctionAdapter } from "../../src/lib/adapters/confidence_auction.adapter.js";
import { SddTrackingAdapter } from "../../src/lib/adapters/sdd_tracking.adapter.js";
import { ScaffolderAdapter } from "../../src/lib/adapters/scaffolder.adapter.js";
import { ProbeRunnerHelper } from "../../src/lib/helpers/probe_runner.helper.js";
import { WorkerOrchestratorAdapter } from "../../src/lib/adapters/worker_orchestrator.adapter.js";
import { ManagementProvider } from "../../src/lib/providers/management.provider.js";
import { IntelligenceProvider } from "../../src/lib/providers/intelligence.provider.js";
import { InfrastructureProvider } from "../../src/lib/providers/infrastructure.provider.js";
import { CommunicationProvider } from "../../src/lib/providers/communication.provider.js";
import { MetaProvider } from "../../src/lib/providers/meta.provider.js";
import { DevInfraProvider } from "../../src/lib/providers/dev_infra.provider.js";
import { OrchestrationProvider } from "../../src/lib/providers/orchestration.provider.js";
import {
  IWorkerRuntime,
  WorkerModel,
  WorkerRuntimeInvocation,
  WorkerRuntimeResult,
} from "../../contracts/worker_orchestrator.contract.js";

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
      stdout: `fake:${invocation.command}`,
      stderr: "",
      durationMs: 10,
      timedOut: false,
    };
  }
}

describe("Tool Registry Smoke (Wiring + Invocation)", () => {
  it("registers tools and invokes representative handlers across all providers", async () => {
    const root = process.cwd();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-tool-smoke-"));
    try {
      const storePath = path.join(tempDir, "store.json");
      const pathGuard = new PathGuard(root, [tempDir]);
      const jailedFs = new JailedFs(root, [tempDir]);
      const store = new StoreAdapter(storePath, jailedFs);
      const agents = new AgentAdapter(store);
      const audit = new AuditAdapter(store);
      const registry = new ToolRegistry();

      registry.register(new ManagementProvider(
        new TaskAdapter(store),
        new DependencyAdapter(store),
        new SchedulerAdapter()
      ));
      registry.register(new IntelligenceProvider(
        new KnowledgeAdapter(store),
        new AdrAdapter(store),
        new IdeaAdapter(store)
      ));
      registry.register(new InfrastructureProvider(
        new LockerAdapter(store, path.join(root, "fixtures/locker/capabilities.json")),
        agents,
        new StatusAdapter(store),
        audit,
        pathGuard
      ));
      registry.register(new CommunicationProvider(
        new MessageAdapter(store),
        new EventStreamAdapter(store),
        new NotificationAdapter(store)
      ));
      registry.register(new MetaProvider(
        new ReviewGateAdapter(store),
        new ArbitrationAdapter(store),
        new MoodAdapter(store),
        new ConfidenceAuctionAdapter(),
        store
      ));
      registry.register(new DevInfraProvider(
        new SddTrackingAdapter(root),
        new ScaffolderAdapter(jailedFs),
        new ProbeRunnerHelper(root),
        pathGuard
      ));
      registry.register(new OrchestrationProvider(
        new WorkerOrchestratorAdapter(store, { cli: new FakeRuntime() }, pathGuard, root)
      ));

      const tools = registry.getTools();
      const toolNames = new Set(tools.map((tool: { name: string }) => tool.name));
      assert.ok(toolNames.has("register_agent"));
      assert.ok(toolNames.has("create_task"));
      assert.ok(toolNames.has("knowledge_add_node"));
      assert.ok(toolNames.has("post_message"));
      assert.ok(toolNames.has("build_plan"));
      assert.ok(toolNames.has("get_sdd_report"));
      assert.ok(toolNames.has("spawn_worker"));
      assert.ok(toolNames.has("dispatch_task"));

      const handlers = registry.getHandlers();
      assert.ok(Object.keys(handlers).length >= 40);

      const registered = await handlers.register_agent({ name: "mc-smoke" });
      assert.strictEqual(registered.name, "User");
      assert.strictEqual(registered.selfName, "mc-smoke");

      await assert.rejects(
        async () => handlers.register_agent({ name: "mc-spoof", model: "Gemini" }),
        () => true
      );

      const task = await handlers.create_task({ title: "Smoke task", description: "Registry call path", agentId: registered.id });
      assert.strictEqual(task.title, "Smoke task");

      const node = await handlers.knowledge_add_node({ type: "note", content: "registry smoke", agentId: registered.id });
      assert.strictEqual(node.type, "note");

      const msg = await handlers.post_message({ sender: "Gemini", content: "hello smoke", channelId: "general", agentId: registered.id });
      assert.strictEqual(msg.sender, "Gemini");

      const built = await handlers.build_plan({
        title: "Smoke Plan",
        sections: [],
        orphanItems: [{ text: "Ship safely", subitems: [] }],
        agentId: registered.id,
      });
      assert.strictEqual(typeof built.markdown, "string");

      const report = await handlers.get_sdd_report({ agentId: registered.id });
      assert.strictEqual(typeof report.overallScore, "number");
      assert.strictEqual(typeof report.isHealthy, "boolean");

      const worker = await handlers.spawn_worker({ name: "codex-smoke", model: "codex_cli", role: "writer", cwd: path.join(root, "src"), agentId: registered.id });
      assert.strictEqual(worker.name, "codex-smoke");
      const workers = await handlers.list_workers({ agentId: registered.id });
      assert.ok(Array.isArray(workers));
      assert.strictEqual(workers.length, 1);
    } finally {
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
