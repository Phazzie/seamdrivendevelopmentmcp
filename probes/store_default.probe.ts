import path from "path";
import os from "os";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { JailedFs } from "../src/lib/helpers/jailed_fs.js";
import fs from "fs";

const ROOT_DIR = process.cwd();
const FIXTURE_PATH = path.join(ROOT_DIR, "fixtures/store/default.json");
const STORE_PATH = path.join(os.tmpdir(), "mcp_store_probe.json");
const SHARD_DIR = path.join(os.tmpdir(), "mcp_store_probe_data");

async function run() {
  if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
  if (fs.existsSync(SHARD_DIR)) fs.rmSync(SHARD_DIR, { recursive: true, force: true });

  const jailedFs = new JailedFs(path.dirname(STORE_PATH));
  const store = new StoreAdapter(STORE_PATH, jailedFs);
  
  // Create a default state
  const data = await store.load(); 
  const state = await store.update(s => { s.panic_mode = true; return s; }, data.revision);

  const fixture = {
    captured_at: new Date().toISOString(),
    scenarios: {
      success: {
        outputs: state
      }
    }
  };

  const dir = path.dirname(FIXTURE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
  console.log("Store fixture written.");
}

run().catch(console.error);