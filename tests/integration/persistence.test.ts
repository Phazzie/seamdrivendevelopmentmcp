import { describe, it } from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";
import { StoreAdapter } from "../../src/lib/adapters/store.adapter.js";
import { JailedFs } from "../../src/lib/helpers/jailed_fs.js";

describe("Store Persistence Integration", () => {
  const tmpDir = path.join(process.cwd(), "tests/tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  
  const storePath = path.join(tmpDir, "persistence_final_check.json");

  it("should persist changes to disk immediately", async () => {
    // Clean start
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath);
    // Also clean shards
    const shardDir = path.join(tmpDir, "persistence_final_check_data");
    if (fs.existsSync(shardDir)) fs.rmSync(shardDir, { recursive: true, force: true });

    const jailedFs = new JailedFs(process.cwd(), [tmpDir]);
    const store = new StoreAdapter(storePath, jailedFs);

    // 1. Load (should create default)
    const initial = await store.load();
    assert.ok(fs.existsSync(storePath), "Store file should exist after load");

    // 2. Update
    await store.update((state) => {
      state.agents.push({ 
        id: "test-agent-final", 
        name: "Tester", 
        createdAt: Date.now(), 
        lastSeenAt: Date.now() 
      });
      return state;
    }, initial.revision);

    // 3. Verify Disk Content (via fresh load)
    const store2 = new StoreAdapter(storePath, jailedFs);
    const reloaded = await store2.load();
    
    assert.strictEqual(reloaded.agents.length, 1, "Reloaded store should have 1 agent");
    const agent = reloaded.agents[0] as { id: string };
    assert.strictEqual(agent.id, "test-agent-final", "Reloaded store should have correct agent ID");
  });
});
