import fs from "fs";
import path from "path";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "status");
const TEMP_STORE = path.join(FIXTURE_DIR, "status_probe_store.json");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const store = new StoreAdapter(TEMP_STORE);
  const data = await store.load();

  const snapshot = {
    revision: data.revision,
    panicMode: data.panic_mode,
    lockCount: data.locks.length,
    taskCount: data.tasks.length,
    messageCount: data.messages.length,
    agentCount: data.agents.length,
    uptimeMs: Math.round(process.uptime() * 1000),
    captured_at: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "snapshot.json"),
    JSON.stringify(snapshot, null, 2)
  );

  if (fs.existsSync(TEMP_STORE)) fs.unlinkSync(TEMP_STORE);
  console.log("Status snapshot fixture written.");
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
