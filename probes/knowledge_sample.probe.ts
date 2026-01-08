// Purpose: capture knowledge graph fixture from the real knowledge adapter.
import fs from "fs";
import path from "path";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { KnowledgeAdapter } from "../src/lib/adapters/knowledge.adapter.js";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "knowledge");
const TEMP_STORE = path.join(FIXTURE_DIR, "knowledge_probe_store.json");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const store = new StoreAdapter(TEMP_STORE);
  try {
    const knowledge = new KnowledgeAdapter(store);

    const term = await knowledge.addNode("term", "SDD");
    const decision = await knowledge.addNode("decision", "Store uses JSON for persistence.");
    await knowledge.linkNodes(term.id, decision.id, "explains");

    const current = await store.load();
    const fixture = {
      captured_at: new Date().toISOString(),
      nodes: current.knowledge.nodes,
      edges: current.knowledge.edges,
    };

    fs.writeFileSync(
      path.join(FIXTURE_DIR, "sample.json"),
      JSON.stringify(fixture, null, 2)
    );

    console.log(`Knowledge fixture written (${fixture.nodes.length} nodes).`);
  } finally {
    if (fs.existsSync(TEMP_STORE)) fs.unlinkSync(TEMP_STORE);
  }
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
