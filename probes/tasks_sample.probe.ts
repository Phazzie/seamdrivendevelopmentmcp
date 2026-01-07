// Purpose: capture a tasks fixture from the real task adapter.
import fs from "fs";
import path from "path";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { TaskAdapter } from "../src/lib/adapters/tasks.adapter.js";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "tasks");
const TEMP_STORE = path.join(FIXTURE_DIR, "tasks_probe_store.json");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const store = new StoreAdapter(TEMP_STORE);
  try {
    const tasks = new TaskAdapter(store);

    await tasks.create("Sample Task", "Captured from probe");
    const second = await tasks.create("Second Task", "Probe status change");
    await tasks.updateStatus(second.id, "done");

    const list = await tasks.list();
    const fixture = {
      captured_at: new Date().toISOString(),
      tasks: list,
    };

    fs.writeFileSync(
      path.join(FIXTURE_DIR, "sample.json"),
      JSON.stringify(fixture, null, 2)
    );

    console.log(`Tasks fixture written (${list.length} tasks).`);
  } finally {
    if (fs.existsSync(TEMP_STORE)) fs.unlinkSync(TEMP_STORE);
  }
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
