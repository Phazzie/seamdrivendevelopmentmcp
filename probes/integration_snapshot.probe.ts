import path from "path";
import os from "os";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { IntegrationSnapshotAdapter } from "../src/lib/adapters/integration_snapshot.adapter.js";
import { JailedFs } from "../src/lib/helpers/jailed_fs.js";
import fs from "fs";

const ROOT_DIR = process.cwd();
const FIXTURE_PATH = path.join(ROOT_DIR, "fixtures/integration_snapshot/snapshot.json");
const STORE_PATH = path.join(os.tmpdir(), "mcp_snap_probe_store.json");

async function run() {
  const jailedFs = new JailedFs(path.dirname(STORE_PATH));
  const store = new StoreAdapter(STORE_PATH, jailedFs);
  const snapshotter = new IntegrationSnapshotAdapter(store, STORE_PATH);

  const snapshot = await snapshotter.getSnapshot();
  
  const fixture = {
    captured_at: new Date().toISOString(),
    scenarios: {
      success: {
        outputs: snapshot
      }
    }
  };

  const dir = path.dirname(FIXTURE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
  console.log("Integration snapshot fixture written.");
}

run().catch(console.error);
