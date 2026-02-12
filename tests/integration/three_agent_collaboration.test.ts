import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import os from "os";
import path from "path";
import { StoreAdapter } from "../../src/lib/adapters/store.adapter.js";
import { JailedFs } from "../../src/lib/helpers/jailed_fs.js";
import { AgentAdapter } from "../../src/lib/adapters/agents.adapter.js";
import { TaskAdapter } from "../../src/lib/adapters/tasks.adapter.js";
import { LockerAdapter } from "../../src/lib/adapters/locker.adapter.js";
import { MessageAdapter } from "../../src/lib/adapters/messages.adapter.js";
import { EventStreamAdapter } from "../../src/lib/adapters/event_stream.adapter.js";
import { ReviewGateAdapter } from "../../src/lib/adapters/review_gate.adapter.js";

type CollaborationEnv = {
  tempDir: string;
  store: StoreAdapter;
  agents: AgentAdapter;
  tasks: TaskAdapter;
  locker: LockerAdapter;
  messages: MessageAdapter;
  events: EventStreamAdapter;
  review: ReviewGateAdapter;
};

function createEnv(): CollaborationEnv {
  const root = process.cwd();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-three-agent-"));
  const storePath = path.join(tempDir, "store.json");
  const jailedFs = new JailedFs(root, [tempDir]);
  const store = new StoreAdapter(storePath, jailedFs);

  return {
    tempDir,
    store,
    agents: new AgentAdapter(store),
    tasks: new TaskAdapter(store),
    locker: new LockerAdapter(store),
    messages: new MessageAdapter(store),
    events: new EventStreamAdapter(store),
    review: new ReviewGateAdapter(store),
  };
}

async function approvePlan(
  review: ReviewGateAdapter,
  planId: string,
  plan: string,
  affectedResources: string[]
): Promise<void> {
  await review.submitPlan(planId, plan, affectedResources);
  await review.submitCritique(planId, "Looks good.");
  await review.approvePlan(planId);
}

function cleanupTempDir(tempDir: string): void {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

describe("Three-Agent Collaboration (Real Store)", () => {
  it("coordinates concurrent locks, contention, and communication", async () => {
    const env = createEnv();
    try {
      const gemini = await env.agents.register("Gemini", "gemini-main");
      const codex = await env.agents.register("Codex", "codex-main");
      const claude = await env.agents.register("Claude", "claude-main");

      await env.tasks.create("Agent 1", "Own resource A", gemini.id);
      await env.tasks.create("Agent 2", "Own resource B", codex.id);
      await env.tasks.create("Agent 3", "Own resource C", claude.id);

      await approvePlan(env.review, "plan-gemini", "Update resource A", ["src/a.ts"]);
      await approvePlan(env.review, "plan-codex", "Update resource B", ["src/b.ts"]);
      await approvePlan(env.review, "plan-claude", "Update resource C", ["src/c.ts"]);

      await Promise.all([
        env.locker.acquire(["src/a.ts"], gemini.id, 60_000, "Gemini work"),
        env.locker.acquire(["src/b.ts"], codex.id, 60_000, "Codex work"),
        env.locker.acquire(["src/c.ts"], claude.id, 60_000, "Claude work"),
      ]);

      const active = await env.locker.list();
      assert.strictEqual(active.length, 3);

      await assert.rejects(
        async () => env.locker.acquire(["src/a.ts"], codex.id, 60_000, "Collision"),
        (err: any) => err.code === "LOCKED"
      );

      await env.messages.post("Gemini", "A complete", { channelId: "coord" });
      await env.messages.post("Codex", "B complete", { channelId: "coord" });
      await env.messages.post("Claude", "C complete", { channelId: "coord" });
      const channelMessages = await env.messages.list({ channelId: "coord", limit: 10 });
      assert.strictEqual(channelMessages.length, 3);

      const published = await env.events.publish({ type: "task_complete", data: { agentId: gemini.id } });
      const waited = await env.events.waitForEvents({
        type: "task_complete",
        since: published.timestamp - 1,
        timeoutMs: 1000,
      });
      assert.ok(waited && waited.length >= 1);

      await Promise.all([
        env.locker.release(["src/a.ts"], gemini.id),
        env.locker.release(["src/b.ts"], codex.id),
        env.locker.release(["src/c.ts"], claude.id),
      ]);

      const afterRelease = await env.locker.list();
      assert.strictEqual(afterRelease.length, 0);
    } finally {
      cleanupTempDir(env.tempDir);
    }
  });

  it("enforces panic freeze and recovers cleanly", async () => {
    const env = createEnv();
    try {
      const gemini = await env.agents.register("Gemini", "gemini-main");
      await env.agents.register("Codex", "codex-main");
      await env.agents.register("Claude", "claude-main");

      const beforePanic = await env.store.load();
      await env.store.update((state) => {
        state.panic_mode = true;
        return state;
      }, beforePanic.revision);

      await assert.rejects(
        async () => env.locker.acquire(["src/panic.ts"], gemini.id, 60_000, "Should block"),
        (err: any) => err.code === "PANIC_MODE"
      );

      const beforeRecover = await env.store.load();
      await env.store.update((state) => {
        state.panic_mode = false;
        return state;
      }, beforeRecover.revision);

      await approvePlan(env.review, "plan-recovered", "Update panic resource", ["src/panic.ts"]);
      const locks = await env.locker.acquire(["src/panic.ts"], gemini.id, 60_000, "Recovered");
      assert.strictEqual(locks.length, 1);
    } finally {
      cleanupTempDir(env.tempDir);
    }
  });
});
