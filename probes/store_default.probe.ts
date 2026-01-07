import fs from "fs";
import path from "path";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "store");
const TEMP_STORE = path.join(FIXTURE_DIR, "store_default_probe.json");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const store = new StoreAdapter(TEMP_STORE);
  const data = await store.load();
  const fixture = { ...data, captured_at: new Date().toISOString() };
  fs.writeFileSync(path.join(FIXTURE_DIR, "default.json"), JSON.stringify(fixture, null, 2));
  if (fs.existsSync(TEMP_STORE)) fs.unlinkSync(TEMP_STORE);
  console.log("Default store fixture written.");
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
