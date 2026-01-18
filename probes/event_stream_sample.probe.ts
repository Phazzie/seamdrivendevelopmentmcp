import path from "path";
import os from "os";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { EventStreamAdapter } from "../src/lib/adapters/event_stream.adapter.js";
import { JailedFs } from "../src/lib/helpers/jailed_fs.js";
import fs from "fs";

const ROOT_DIR = process.cwd();
const FIXTURE_PATH = path.join(ROOT_DIR, "fixtures/event_stream/sample.json");
const STORE_PATH = path.join(os.tmpdir(), "mcp_event_probe_store.json");

async function run() {
  const jailedFs = new JailedFs(path.dirname(STORE_PATH));
  const store = new StoreAdapter(STORE_PATH, jailedFs);
  const events = new EventStreamAdapter(store);

  await events.publish({ type: "test_event", data: { foo: "bar" } });
  const list = await events.list();
  
  const fixture = {
    captured_at: new Date().toISOString(),
    scenarios: {
      success: {
        outputs: {
          events: list
        }
      }
    }
  };

  const dir = path.dirname(FIXTURE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
  console.log("EventStream fixture written.");
}

run().catch(console.error);