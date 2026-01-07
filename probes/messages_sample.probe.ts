// Purpose: capture a messages fixture from the real message adapter.
import fs from "fs";
import path from "path";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { MessageAdapter } from "../src/lib/adapters/messages.adapter.js";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "messages");
const TEMP_STORE = path.join(FIXTURE_DIR, "messages_probe_store.json");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const store = new StoreAdapter(TEMP_STORE);
  try {
    const messages = new MessageAdapter(store);

    await messages.post("codex", "Probe hello");
    await messages.post("gemini", "Probe response", { channel: "probe" });

    const list = await messages.list();
    const current = await store.load();

    const fixture = {
      captured_at: new Date().toISOString(),
      revision: current.revision,
      messages: list,
    };

    fs.writeFileSync(
      path.join(FIXTURE_DIR, "sample.json"),
      JSON.stringify(fixture, null, 2)
    );

    console.log(`Messages fixture written (${list.length} messages).`);
  } finally {
    if (fs.existsSync(TEMP_STORE)) fs.unlinkSync(TEMP_STORE);
  }
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
