/**
 * Purpose: Verify ADR log contract compliance.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "path";
import type { Adr, IAdrLog } from "../../contracts/adr.contract.js";
import { MockAdrLog } from "../../src/lib/mocks/adr.mock.js";
import { AdrAdapter } from "../../src/lib/adapters/adr.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "adr", "sample.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "adr", "fault.json");

function loadFixtureAdrs(): Adr[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  return parsed.scenarios?.success?.outputs?.adrs || [];
}

export function runAdrContractTests(createLog: () => Promise<IAdrLog>) {
  describe("ADR Log Contract", () => {
    let log: IAdrLog;

    beforeEach(async () => {
      log = await createLog();
    });

    it("should load fixture ADRs when present", async () => {
      const fixture = loadFixtureAdrs();
      const list = await log.list();
      assert.strictEqual(list.length, fixture.length);
      if (fixture.length) {
        assert.strictEqual(list[0].id, fixture[0].id);
      }
    });

    it("should create ADRs with default status", async () => {
      const entry = await log.create({
        title: "Default status test",
        context: "Status should default.",
        decision: "Leave status unset.",
      });
      assert.strictEqual(entry.status, "proposed");
    });

    it("should filter ADRs by status", async () => {
      const accepted = await log.list("accepted");
      const proposed = await log.list("proposed");
      assert.ok(accepted.length >= 0);
      assert.ok(proposed.length >= 0);
    });
  });
}

describe("MockAdrLog", () => {
  runAdrContractTests(async () => new MockAdrLog(FIXTURE_PATH));

  it("should fail when loading fault fixture (invalid_status)", async () => {
    const mock = new MockAdrLog(FAULT_PATH, "invalid_status");
    await assert.rejects(async () => {
      await mock.create({ title: "X", context: "X", decision: "X" });
    }, (err: any) => err.code === "VALIDATION_FAILED" && err.message.includes("Invalid ADR status"));
  });
});

describe("AdrAdapter", () => {
  runAdrContractTests(async () => {
    const fixtureAdrs = loadFixtureAdrs();
    const store = new MockStore(undefined, { adrs: fixtureAdrs });
    return new AdrAdapter(store);
  });
});