import { describe, it, after } from "node:test";
import assert from "node:assert";
import path from "path";
import os from "os";
import fs from "fs";
import { StoreAdapter } from "../../src/lib/adapters/store.adapter.js";
import { JailedFs } from "../../src/lib/helpers/jailed_fs.js";
import { AgentAdapter } from "../../src/lib/adapters/agents.adapter.js";

describe("MCP External Store Fix Verification", () => {
  const root = process.cwd();
  const tmpBase = os.tmpdir();
  const extStoreDir = path.join(tmpBase, `mcp-store-test-${Date.now()}`);
  const storePath = path.join(extStoreDir, "store.json");

  if (!fs.existsSync(extStoreDir)) fs.mkdirSync(extStoreDir, { recursive: true });

  const cleanup = () => {
    if (fs.existsSync(extStoreDir)) fs.rmSync(extStoreDir, { recursive: true, force: true });
  };

  after(cleanup);

  it("should allow Agent registration in an external whitelisted store", async () => {
    // This mimics the ServerBootstrap wiring
    const jfs = new JailedFs(root, [extStoreDir]);
    const store = new StoreAdapter(storePath, jfs);
    const agents = new AgentAdapter(store);

    const agent = await agents.register("Gemini", "gemini-ext-store");
    assert.ok(agent.id, "Agent should have an ID");
    assert.strictEqual(agent.name, "Gemini");
    
    // Verify it was actually written to the external path
    const manifest = JSON.parse(fs.readFileSync(storePath, "utf-8"));
    assert.ok(fs.existsSync(path.join(extStoreDir, "store_data", "agents.json")), "Agents shard should exist in external dir");
  });
});
