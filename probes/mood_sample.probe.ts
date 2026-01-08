// Purpose: capture mood log fixture from the real mood adapter.
import fs from "fs";
import path from "path";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { MoodAdapter } from "../src/lib/adapters/mood.adapter.js";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "mood");
const TEMP_STORE = path.join(FIXTURE_DIR, "mood_probe_store.json");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const store = new StoreAdapter(TEMP_STORE);
  try {
    const mood = new MoodAdapter(store);

    await mood.log({ agentId: "codex", mood: "focused", note: "Deep in implementation." });
    await mood.log({ agentId: "gemini", mood: "confused", note: "Need clarity on requirements." });

    const list = await mood.list();
    const fixture = {
      captured_at: new Date().toISOString(),
      entries: list,
    };

    fs.writeFileSync(
      path.join(FIXTURE_DIR, "sample.json"),
      JSON.stringify(fixture, null, 2)
    );

    console.log(`Mood fixture written (${list.length} entries).`);
  } finally {
    if (fs.existsSync(TEMP_STORE)) fs.unlinkSync(TEMP_STORE);
  }
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
