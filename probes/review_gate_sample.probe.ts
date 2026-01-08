// Purpose: capture review gate fixture from the real adapter.
import fs from "fs";
import path from "path";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { ReviewGateAdapter } from "../src/lib/adapters/review_gate.adapter.js";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "review_gate");
const TEMP_STORE = path.join(FIXTURE_DIR, "review_gate_probe_store.json");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const store = new StoreAdapter(TEMP_STORE);
  try {
    const gates = new ReviewGateAdapter(store);
    await gates.submitPlan("plan-001", "## Plan\n- [ ] Task A\n");
    const list = await gates.list();

    const fixture = {
      captured_at: new Date().toISOString(),
      gates: list,
    };

    fs.writeFileSync(
      path.join(FIXTURE_DIR, "sample.json"),
      JSON.stringify(fixture, null, 2)
    );

    console.log(`Review gate fixture written (${list.length} gate).`);
  } finally {
    if (fs.existsSync(TEMP_STORE)) fs.unlinkSync(TEMP_STORE);
  }
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
