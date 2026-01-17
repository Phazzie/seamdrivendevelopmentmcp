/**
 * Purpose: Verify review gate contract compliance.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import type { IReviewGate, ReviewGate } from "../../contracts/review_gate.contract.js";
import { MockReviewGate } from "../../src/lib/mocks/review_gate.mock.js";
import { ReviewGateAdapter } from "../../src/lib/adapters/review_gate.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "review_gate", "sample.json");

function loadFixtureGates(): ReviewGate[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as { gates?: ReviewGate[] };
  return Array.isArray(parsed.gates) ? parsed.gates : [];
}

export function runReviewGateContractTests(createGate: () => Promise<IReviewGate>) {
  describe("Review Gate Contract", () => {
    let gate: IReviewGate;

    beforeEach(async () => {
      gate = await createGate();
    });

    it("should submit, critique, and approve plans", async () => {
      const planId = "plan-test";
      const submitted = await gate.submitPlan(planId, "## Plan\n- [ ] Task A\n");
      assert.strictEqual(submitted.status, "pending");

      await assert.rejects(async () => {
        await gate.approvePlan(planId);
      });

      const critiqued = await gate.submitCritique(planId, "Needs more detail.");
      assert.strictEqual(critiqued.status, "critique_submitted");

      const approved = await gate.approvePlan(planId);
      assert.strictEqual(approved.status, "approved");
    });
  });
}

describe("MockReviewGate", () => {
  runReviewGateContractTests(async () => new MockReviewGate());
});

describe("ReviewGateAdapter", () => {
  runReviewGateContractTests(async () => {
    const fixture = loadFixtureGates();
    const store = new MockStore(undefined, { review_gates: fixture });
    return new ReviewGateAdapter(store);
  });
});
