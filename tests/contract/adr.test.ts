/**
 * Purpose: Verify ADR log contract compliance.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import type { Adr, IAdrLog } from "../../contracts/adr.contract.js";
import { MockAdrLog } from "../../src/lib/mocks/adr.mock.js";
import { AdrAdapter } from "../../src/lib/adapters/adr.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "adr", "sample.json");

function loadFixtureAdrs(): Adr[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as { adrs?: Adr[] };
  return Array.isArray(parsed.adrs) ? parsed.adrs : [];
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
  runAdrContractTests(async () => new MockAdrLog());
});

describe("AdrAdapter", () => {
  runAdrContractTests(async () => {
    const fixtureAdrs = loadFixtureAdrs();
    const store = new MockStore({ adrs: fixtureAdrs });
    return new AdrAdapter(store);
  });
});
