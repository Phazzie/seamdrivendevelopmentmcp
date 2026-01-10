/**
 * Purpose: Verify ideas contract compliance (ideas seam).
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import type { IIdeaRegistry, Idea } from "../../contracts/ideas.contract.js";
import { MockIdeaRegistry } from "../../src/lib/mocks/ideas.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "ideas", "sample.json");

type IdeaScenarioOutputs = {
  create: Idea;
  update: Idea;
  list: Idea[];
  get: Idea;
  addNote: Idea;
};

function loadFixtureOutputs(): IdeaScenarioOutputs {
  if (!fs.existsSync(FIXTURE_PATH)) {
    throw new Error("Missing ideas fixture");
  }
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as { scenarios?: Record<string, { outputs?: IdeaScenarioOutputs }> };
  const outputs = parsed.scenarios?.success?.outputs;
  if (!outputs) {
    throw new Error("Missing ideas fixture outputs");
  }
  return outputs;
}

export function runIdeaContractTests(createRegistry: () => Promise<IIdeaRegistry>) {
  describe("Idea Registry Contract", () => {
    let ideas: IIdeaRegistry;
    const outputs = loadFixtureOutputs();

    beforeEach(async () => {
      ideas = await createRegistry();
    });

    it("should load fixture ideas when present", async () => {
      const list = await ideas.list();
      assert.ok(Array.isArray(list));
      if (outputs.list.length) {
        assert.ok(list.find((idea) => idea.id === outputs.list[0].id));
      }
    });

    it("should create an idea with default status", async () => {
      const created = await ideas.create({ title: outputs.create.title });
      assert.strictEqual(created.title, outputs.create.title);
      assert.strictEqual(created.status, outputs.create.status);
      assert.strictEqual(created.summary, outputs.create.summary);
      assert.deepStrictEqual(created.tags, outputs.create.tags);
      assert.deepStrictEqual(created.notes, []);
      assert.ok(created.id);
    });

    it("should update an idea", async () => {
      const created = await ideas.create({ title: outputs.create.title });
      const updated = await ideas.update({
        id: created.id,
        status: outputs.update.status,
        tags: outputs.update.tags,
      });
      assert.strictEqual(updated.id, created.id);
      assert.strictEqual(updated.status, outputs.update.status);
      assert.deepStrictEqual(updated.tags, outputs.update.tags);
    });

    it("should list ideas including recent creates", async () => {
      const created = await ideas.create({ title: outputs.create.title });
      const list = await ideas.list();
      assert.ok(list.find((idea) => idea.id === created.id));
    });

    it("should get an idea by id", async () => {
      const created = await ideas.create({ title: outputs.create.title });
      const fetched = await ideas.get({ id: created.id });
      assert.strictEqual(fetched.id, created.id);
    });

    it("should add notes to an idea", async () => {
      const created = await ideas.create({ title: outputs.create.title });
      const noteBody = outputs.addNote.notes[0]?.body ?? "First note";
      const updated = await ideas.addNote({ ideaId: created.id, body: noteBody });
      assert.ok(updated.notes.find((note) => note.body === noteBody));
    });

    it("should fail for unknown ideas", async () => {
      await assert.rejects(async () => {
        await ideas.get({ id: "00000000-0000-0000-0000-000000000000" });
      }, (err: any) => err.code === "VALIDATION_FAILED");
    });
  });
}

describe("MockIdeaRegistry", () => {
  runIdeaContractTests(async () => new MockIdeaRegistry());
});
