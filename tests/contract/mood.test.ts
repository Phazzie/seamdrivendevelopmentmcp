import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import path from "path";
import type { IMoodLog } from "../../contracts/mood.contract.js";
import { MockMoodLog } from "../../src/lib/mocks/mood.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "mood", "sample.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "mood", "fault.json");

export function runMoodContractTests(createLog: () => Promise<IMoodLog>) {
  describe("Mood Log Contract", () => {
    let log: IMoodLog;

    beforeEach(async () => {
      log = await createLog();
    });

    it("should load fixture moods when present", async () => {
      const list = await log.list();
      assert.ok(Array.isArray(list));
    });

    it("should log moods", async () => {
      const entry = await log.log({ agentId: "a1", mood: "productive" });
      assert.strictEqual(entry.mood, "productive");
    });
  });
}

describe("MockMoodLog", () => {
  runMoodContractTests(async () => new MockMoodLog(FIXTURE_PATH));

  it("should fail when loading fault fixture (invalid_mood)", async () => {
    const mock = new MockMoodLog(FAULT_PATH, "invalid_mood");
    await assert.rejects(async () => {
      await mock.log({ agentId: "a1", mood: "bad" });
    }, (err: any) => err.code === "VALIDATION_FAILED" && err.message.includes("Unrecognized mood"));
  });
});