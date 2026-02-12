import { describe, it } from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";
import { AgentAdapter } from "../../src/lib/adapters/agents.adapter.js";
import { StoreAdapter } from "../../src/lib/adapters/store.adapter.js";
import { JailedFs } from "../../src/lib/helpers/jailed_fs.js";

describe("Agent Identity Persistence", () => {
  const tmpDir = path.join(process.cwd(), "tests/tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const storePath = path.join(tmpDir, "identity_test.json");

  it("should reuse existing agent ID when registering with same model + selfName", async () => {
    // Clean start
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath);
    
    // Also clean shards
    const shardDir = path.join(tmpDir, "identity_test_data");
    if (fs.existsSync(shardDir)) fs.rmSync(shardDir, { recursive: true, force: true });

    const jailedFs = new JailedFs(process.cwd(), [tmpDir]);
    const store = new StoreAdapter(storePath, jailedFs);
    const agents = new AgentAdapter(store);

    // 1. First Registration
    const a1 = await agents.register("Gemini", "gemini-main");
    assert.ok(a1.id, "Agent 1 should have an ID");

    // 2. Second Registration
    const a2 = await agents.register("Gemini", "gemini-main");
    assert.ok(a2.id, "Agent 2 should have an ID");

    // 3. Verification
    assert.strictEqual(a1.id, a2.id, "IDs should be identical for the same name");
    assert.ok(a2.lastSeenAt >= a1.lastSeenAt, "LastSeenAt should update");
  });

  it("should allow multiple sessions per model via unique selfName", async () => {
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath);
    const shardDir = path.join(tmpDir, "identity_test_data");
    if (fs.existsSync(shardDir)) fs.rmSync(shardDir, { recursive: true, force: true });

    const jailedFs = new JailedFs(process.cwd(), [tmpDir]);
    const store = new StoreAdapter(storePath, jailedFs);
    const agents = new AgentAdapter(store);

    const a1 = await agents.register("Claude", "claude-alpha");
    const a2 = await agents.register("Claude", "claude-beta");

    assert.notStrictEqual(a1.id, a2.id, "Distinct selfName should create distinct sessions");
    assert.strictEqual(a1.name, "Claude");
    assert.strictEqual(a2.name, "Claude");

    await assert.rejects(
      async () => agents.register("Gemini", "claude-alpha"),
      (err: any) => err.code === "VALIDATION_FAILED" && err.message.includes("already registered")
    );
  });
});
