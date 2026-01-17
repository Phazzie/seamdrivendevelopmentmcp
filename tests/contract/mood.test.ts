/**
 * Purpose: Verify mood log contract compliance.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import type { IMoodLog, MoodEntry } from "../../contracts/mood.contract.js";
import { MockMoodLog } from "../../src/lib/mocks/mood.mock.js";
import { MoodAdapter } from "../../src/lib/adapters/mood.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "mood", "sample.json");

function loadFixtureEntries(): MoodEntry[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as { entries?: MoodEntry[] };
  return Array.isArray(parsed.entries) ? parsed.entries : [];
}

export function runMoodContractTests(createLog: () => Promise<IMoodLog>) {
  describe("Mood Log Contract", () => {
    let log: IMoodLog;

    beforeEach(async () => {
      log = await createLog();
    });

    it("should load fixture moods when present", async () => {
      const fixture = loadFixtureEntries();
      const list = await log.list();
      assert.strictEqual(list.length, fixture.length);
      if (fixture.length) {
        assert.strictEqual(list[0].id, fixture[0].id);
      }
    });

    it("should log moods", async () => {
      const entry = await log.log({ agentId: "codex", mood: "focused" });
      assert.strictEqual(entry.agentId, "codex");
      assert.strictEqual(entry.mood, "focused");
    });

    it("should filter moods by agent", async () => {
      const list = await log.list({ agentId: "gemini" });
      assert.ok(list.every((entry) => entry.agentId === "gemini"));
    });
  });
}

describe("MockMoodLog", () => {
  runMoodContractTests(async () => new MockMoodLog());
});

describe("MoodAdapter", () => {
  runMoodContractTests(async () => {
    const fixture = loadFixtureEntries();
    const store = new MockStore(undefined, { moods: fixture });
    return new MoodAdapter(store);
  });
});
