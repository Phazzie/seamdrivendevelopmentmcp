import { describe, it } from "node:test";
import assert from "node:assert";
import { AppError } from "../../contracts/store.contract.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";
import { AgentAdapter } from "../../src/lib/adapters/agents.adapter.js";
import { AuditAdapter } from "../../src/lib/adapters/audit.adapter.js";
import { ToolExecutor, ToolRegistry } from "../../src/lib/helpers/tool_registry.js";

describe("ToolExecutor agent context + write guard", () => {
  it("requires agentId for non-public tools", async () => {
    const store = new MockStore();
    const executor = new ToolExecutor(new AgentAdapter(store), new AuditAdapter(store), store);

    await assert.rejects(
      async () => executor.execute("create_task", async () => ({ ok: true }), { title: "x" }),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_FAILED"
    );
  });

  it("rejects unknown agentId for non-public tools", async () => {
    const store = new MockStore();
    const executor = new ToolExecutor(new AgentAdapter(store), new AuditAdapter(store), store);

    await assert.rejects(
      async () =>
        executor.execute("create_task", async () => ({ ok: true }), { title: "x", agentId: "missing-agent" }),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_FAILED"
    );
  });

  it("allows public registration tool without agentId", async () => {
    const store = new MockStore();
    const executor = new ToolExecutor(new AgentAdapter(store), new AuditAdapter(store), store);

    const result = await executor.execute(
      "register_agent",
      async (args) => ({ status: "ok", args }),
      { name: "mc-test" }
    );

    assert.strictEqual(result.status, "ok");
  });

  it("blocks mutating tools during panic mode", async () => {
    const store = new MockStore();
    const agents = new AgentAdapter(store);
    const audit = new AuditAdapter(store);
    const executor = new ToolExecutor(agents, audit, store);
    const agent = await agents.register("Codex", "codex-guard");

    const before = await store.load();
    await store.update((current) => ({ ...current, panic_mode: true }), before.revision);

    let called = false;
    await assert.rejects(
      async () =>
        executor.execute(
          "create_task",
          async () => {
            called = true;
            return { ok: true };
          },
          { title: "guard", agentId: agent.id }
        ),
      (err: unknown) => err instanceof AppError && err.code === "PANIC_MODE"
    );
    assert.strictEqual(called, false);
  });

  it("allows resolve_panic during panic mode", async () => {
    const store = new MockStore();
    const agents = new AgentAdapter(store);
    const audit = new AuditAdapter(store);
    const executor = new ToolExecutor(agents, audit, store);
    const agent = await agents.register("Codex", "codex-resolver");

    const before = await store.load();
    await store.update((current) => ({ ...current, panic_mode: true }), before.revision);

    const result = await executor.execute(
      "resolve_panic",
      async () => ({ status: "allowed" }),
      { agentId: agent.id }
    );

    assert.deepStrictEqual(result, { status: "allowed" });
  });
});

describe("ToolRegistry registration validation", () => {
  it("rejects duplicate tool names across providers", () => {
    const registry = new ToolRegistry();
    const providerA = {
      getTools: () => [{ name: "duplicate_tool" }],
      getHandlers: () => ({ duplicate_tool: async () => ({ ok: true }) }),
    };
    const providerB = {
      getTools: () => [{ name: "duplicate_tool" }],
      getHandlers: () => ({ duplicate_tool: async () => ({ ok: true }) }),
    };

    registry.register(providerA);
    assert.throws(
      () => registry.register(providerB),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_FAILED"
    );
  });

  it("rejects tools missing a handler", () => {
    const registry = new ToolRegistry();
    const brokenProvider = {
      getTools: () => [{ name: "missing_handler_tool" }],
      getHandlers: () => ({}),
    };

    assert.throws(
      () => registry.register(brokenProvider),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_FAILED"
    );
  });
});
