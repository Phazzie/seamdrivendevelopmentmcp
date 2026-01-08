// Purpose: capture ADR fixture from the real ADR adapter.
import fs from "fs";
import path from "path";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { AdrAdapter } from "../src/lib/adapters/adr.adapter.js";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "adr");
const TEMP_STORE = path.join(FIXTURE_DIR, "adr_probe_store.json");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const store = new StoreAdapter(TEMP_STORE);
  try {
    const adr = new AdrAdapter(store);

    await adr.create({
      title: "Adopt SDD",
      status: "accepted",
      context: "We need a predictable development process.",
      decision: "Use seam-driven development for new features.",
    });

    await adr.create({
      title: "Persist knowledge in store",
      status: "proposed",
      context: "Knowledge should survive restarts.",
      decision: "Store knowledge graph in store.json for v1.",
    });

    const list = await adr.list();
    const fixture = {
      captured_at: new Date().toISOString(),
      adrs: list,
    };

    fs.writeFileSync(
      path.join(FIXTURE_DIR, "sample.json"),
      JSON.stringify(fixture, null, 2)
    );

    console.log(`ADR fixture written (${list.length} entries).`);
  } finally {
    if (fs.existsSync(TEMP_STORE)) fs.unlinkSync(TEMP_STORE);
  }
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
