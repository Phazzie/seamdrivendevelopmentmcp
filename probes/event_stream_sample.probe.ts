// Purpose: capture event stream fixture from the real event stream adapter.
import fs from "fs";
import path from "path";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { EventStreamAdapter } from "../src/lib/adapters/event_stream.adapter.js";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "event_stream");
const TEMP_STORE = path.join(FIXTURE_DIR, "event_stream_probe_store.json");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const store = new StoreAdapter(TEMP_STORE);
  try {
    const events = new EventStreamAdapter(store);

    await events.publish({ type: "task", data: { action: "created", taskId: "probe-task" } });
    await events.publish({ type: "message", data: { channelId: "general" } });

    const list = await events.list();
    const fixture = {
      captured_at: new Date().toISOString(),
      events: list,
    };

    fs.writeFileSync(
      path.join(FIXTURE_DIR, "sample.json"),
      JSON.stringify(fixture, null, 2)
    );

    console.log(`Event stream fixture written (${list.length} events).`);
  } finally {
    if (fs.existsSync(TEMP_STORE)) fs.unlinkSync(TEMP_STORE);
  }
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
