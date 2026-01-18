import path from "path";
import os from "os";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { ArbitrationAdapter } from "../src/lib/adapters/arbitration.adapter.js";
import { JailedFs } from "../src/lib/helpers/jailed_fs.js";
import fs from "fs";

const ROOT_DIR = process.cwd();
const FIXTURE_PATH = path.join(ROOT_DIR, "fixtures/arbitration/sample.json");
const STORE_PATH = path.join(os.tmpdir(), "mcp_arb_probe_store.json");

async function run() {
  if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
  
  const jailedFs = new JailedFs(path.dirname(STORE_PATH));
  const store = new StoreAdapter(STORE_PATH, jailedFs);
  const arb = new ArbitrationAdapter(store);

  const idleState = await arb.getState();
  
  await arb.request("agent-1");
  const requestedState = await arb.getState();

  const fixture = {
    captured_at: new Date().toISOString(),
    scenarios: {
      success: {
        outputs: {
          state: idleState
        }
      },
      requested: {
        outputs: {
          state: requestedState
        }
      }
    }
  };

  const dir = path.dirname(FIXTURE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
  console.log("Arbitration fixture written.");
}

run().catch(console.error);