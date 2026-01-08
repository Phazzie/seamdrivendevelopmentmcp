// Purpose: capture dependency fixture from the real dependency adapter.
import fs from "fs";
import path from "path";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { TaskAdapter } from "../src/lib/adapters/tasks.adapter.js";
import { DependencyAdapter } from "../src/lib/adapters/dependency.adapter.js";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "dependency");
const TEMP_STORE = path.join(FIXTURE_DIR, "dependency_probe_store.json");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const store = new StoreAdapter(TEMP_STORE);
  try {
    const tasks = new TaskAdapter(store);
    const deps = new DependencyAdapter(store);

    const root = await tasks.create("Dependency root", "Root task with no dependencies.");
    await tasks.updateStatus(root.id, "done");
    const child = await tasks.create("Dependent task", "Blocked until root is done.");
    await deps.addDependency(child.id, root.id);
    const chain = await tasks.create("Blocked chain", "Blocked until dependent task is done.");
    await deps.addDependency(chain.id, child.id);

    const list = await tasks.list();
    const fixture = {
      captured_at: new Date().toISOString(),
      tasks: list,
    };

    fs.writeFileSync(
      path.join(FIXTURE_DIR, "sample.json"),
      JSON.stringify(fixture, null, 2)
    );

    console.log(`Dependency fixture written (${list.length} tasks).`);
  } finally {
    if (fs.existsSync(TEMP_STORE)) fs.unlinkSync(TEMP_STORE);
  }
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
