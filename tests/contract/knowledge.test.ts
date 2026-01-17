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
import { KnowledgeFixtureSchema } from "../../contracts/knowledge.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "knowledge", "sample.json");

function loadFixture() {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  return KnowledgeFixtureSchema.parse(JSON.parse(raw));
}

test("Knowledge Contract - Mock", async () => {
  const fixture = loadFixture();
  const mock = new MockKnowledgeGraph();

  const resultAll = await mock.query({});
  assert.strictEqual(resultAll.nodes.length, fixture.nodes.length);
  assert.strictEqual(resultAll.edges.length, fixture.edges.length);

  const termQuery = await mock.query({ type: "term" });
  assert.strictEqual(termQuery.nodes.length, 1);
  assert.strictEqual(termQuery.nodes[0].type, "term");
  assert.strictEqual(termQuery.edges.length, 0);
});

test("Knowledge Contract - Adapter", async () => {
  const fixture = loadFixture();
  const store = new MockStore(undefined, {
    knowledge: { nodes: fixture.nodes, edges: fixture.edges },
  });
  const adapter = new KnowledgeAdapter(store);

  const resultAll = await adapter.query({});
  assert.strictEqual(resultAll.nodes.length, fixture.nodes.length);
  assert.strictEqual(resultAll.edges.length, fixture.edges.length);

  const node = await adapter.addNode("note", "Seam-driven development note.");
  assert.strictEqual(node.type, "note");

  const edge = await adapter.linkNodes(fixture.nodes[0].id, node.id, "references");
  assert.strictEqual(edge.relation, "references");

  const noteQuery = await adapter.query({ type: "note" });
  assert.strictEqual(noteQuery.nodes.length, 1);
});
