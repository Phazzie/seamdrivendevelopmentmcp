// Purpose: capture arbitration fixture from the real arbitration adapter.
import fs from "fs";
import path from "path";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { ArbitrationAdapter } from "../src/lib/adapters/arbitration.adapter.js";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "arbitration");
const TEMP_STORE = path.join(FIXTURE_DIR, "arbitration_probe_store.json");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const store = new StoreAdapter(TEMP_STORE);
  try {
    const arbitration = new ArbitrationAdapter(store);
    const state = await arbitration.getState();
    const fixture = {
      captured_at: new Date().toISOString(),
      state,
    };

    fs.writeFileSync(
      path.join(FIXTURE_DIR, "sample.json"),
      JSON.stringify(fixture, null, 2)
    );

    console.log("Arbitration fixture written.");
  } finally {
    if (fs.existsSync(TEMP_STORE)) fs.unlinkSync(TEMP_STORE);
  }
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
