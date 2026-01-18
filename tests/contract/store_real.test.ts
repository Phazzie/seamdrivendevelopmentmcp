import { describe, after, it } from "node:test";
import assert from "node:assert";
import path from "path";
import fs from "fs";
import { runStoreContractTests } from "./store.test.js"; 
import { StoreAdapter } from "../../src/lib/adapters/store.adapter.js";
import { JailedFs } from "../../src/lib/helpers/jailed_fs.js";

describe("Real StoreAdapter Implementation", () => {
  const TEST_DIR = path.join(process.cwd(), "tests/tmp");
  const TEST_FILE = path.join(TEST_DIR, "real_store.json");
  const SHARD_DIR = path.join(TEST_DIR, "real_store_data");
  const jailedFs = new JailedFs(process.cwd());

  if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });

  const cleanup = () => {
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
    if (fs.existsSync(SHARD_DIR)) fs.rmSync(SHARD_DIR, { recursive: true, force: true });
  };

  after(cleanup);

  runStoreContractTests(async () => {
    cleanup();
    return new StoreAdapter(TEST_FILE, jailedFs);
  });

  it("should create shard files on update", async () => {
    cleanup();
    const store = new StoreAdapter(TEST_FILE, jailedFs);
    await store.load();
    await store.update(s => {
      s.tasks.push({ 
        id: "t1", title: "Shard Test", status: "todo", 
        description: "d", blockedBy: [], created_at: 0, updated_at: 0 
      });
      return s;
    }, 1);

    assert.ok(fs.existsSync(path.join(SHARD_DIR, "tasks.json")), "Tasks shard should exist");
    
    // Manifest should be small
    const manifest = JSON.parse(fs.readFileSync(TEST_FILE, "utf-8"));
    assert.strictEqual(manifest.tasks.length, 0, "Manifest should have empty tasks array");
  });
});