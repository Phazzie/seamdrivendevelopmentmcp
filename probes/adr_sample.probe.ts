import path from "path";
import os from "os";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { AdrAdapter } from "../src/lib/adapters/adr.adapter.js";
import { JailedFs } from "../src/lib/helpers/jailed_fs.js";
import fs from "fs";

const ROOT_DIR = process.cwd();
const FIXTURE_PATH = path.join(ROOT_DIR, "fixtures/adr/sample.json");
const STORE_PATH = path.join(os.tmpdir(), "mcp_adr_probe_store.json");

async function run() {
  const jailedFs = new JailedFs(path.dirname(STORE_PATH));
  const store = new StoreAdapter(STORE_PATH, jailedFs);
  const adrs = new AdrAdapter(store);

  await adrs.create({
    title: "Use Zod for validation",
    status: "accepted",
    context: "Need type safety",
    decision: "Use Zod",
  });

  await adrs.create({
    title: "Async Store",
    status: "proposed",
    context: "Sync is slow",
    decision: "Move to promises",
  });

  const list = await adrs.list();
  
  const fixture = {
    captured_at: new Date().toISOString(),
    scenarios: {
      success: {
        outputs: {
          adrs: list
        }
      }
    }
  };

  const dir = path.dirname(FIXTURE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
  console.log("ADR fixture written.");
}

run().catch(console.error);