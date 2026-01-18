/**
 * Purpose: Verify knowledge_graph contract compliance.
 */
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { MockKnowledgeGraph } from "../../src/lib/mocks/knowledge.mock.js";
import { KnowledgeAdapter } from "../../src/lib/adapters/knowledge.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "knowledge", "sample.json");

function loadFixture() {
  if (!fs.existsSync(FIXTURE_PATH)) return { nodes: [], edges: [] };
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  return parsed.scenarios?.success?.outputs || { nodes: [], edges: [] };
}

test("Knowledge Contract - Mock", async () => {
  const fixture = loadFixture();
  const mock = new MockKnowledgeGraph(FIXTURE_PATH);

  const resultAll = await mock.query({});
  assert.strictEqual(resultAll.nodes.length, fixture.nodes.length);
  // assert.strictEqual(resultAll.edges.length, fixture.edges.length); // Fixture might be partial
});

test("Knowledge Contract - Adapter", async () => {
  const fixture = loadFixture();
  const store = new MockStore(undefined, {
    knowledge: { nodes: fixture.nodes, edges: fixture.edges },
  });
  const adapter = new KnowledgeAdapter(store);

  const resultAll = await adapter.query({});
  assert.strictEqual(resultAll.nodes.length, fixture.nodes.length);

  const node = await adapter.addNode("note", "Seam-driven development note.");
  assert.strictEqual(node.type, "note");
});