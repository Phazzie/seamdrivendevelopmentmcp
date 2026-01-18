import path from "path";
import os from "os";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { TaskAdapter } from "../src/lib/adapters/tasks.adapter.js";
import { JailedFs } from "../src/lib/helpers/jailed_fs.js";
import fs from "fs";

const ROOT_DIR = process.cwd();
const FIXTURE_PATH = path.join(ROOT_DIR, "fixtures/tasks/sample.json");
const STORE_PATH = path.join(os.tmpdir(), "mcp_task_probe_store.json");

async function run() {
  const jailedFs = new JailedFs(path.dirname(STORE_PATH));
  const store = new StoreAdapter(STORE_PATH, jailedFs);
  const tasks = new TaskAdapter(store);

  await tasks.create("Test Task", "Desc");
  const list = await tasks.list();
  
  const fixture = {
    captured_at: new Date().toISOString(),
    scenarios: {
      success: {
        outputs: {
          tasks: list
        }
      }
    }
  };

  const dir = path.dirname(FIXTURE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
  console.log("Tasks fixture written.");
}

run().catch(console.error);