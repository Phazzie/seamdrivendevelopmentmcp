/**
 * Purpose: Verify review gate contract compliance.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "path";
import type { IReviewGate, ReviewGate } from "../../contracts/review_gate.contract.js";
import { MockReviewGate } from "../../src/lib/mocks/review_gate.mock.js";
import { ReviewGateAdapter } from "../../src/lib/adapters/review_gate.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";
import { MockIntentVerifier } from "../../src/lib/mocks/intent_verifier.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "review_gate", "sample.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "review_gate", "fault.json");

function loadFixtureGates(): ReviewGate[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  return parsed.scenarios?.success?.outputs?.gates || [];
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
  runReviewGateContractTests(async () => new MockReviewGate(FIXTURE_PATH));

  it("should fail when loading fault fixture", async () => {
    const mock = new MockReviewGate(FAULT_PATH, "plan_rejected");
    await assert.rejects(async () => {
      await mock.submitPlan("id", "plan");
    }, (err: any) => err.code === "VALIDATION_FAILED");
  });

  it("should fail for lying agent scenario", async () => {
    const mock = new MockReviewGate(FAULT_PATH, "lying_agent");
    await assert.rejects(async () => {
      await mock.submitPlan("id", "plan");
    }, (err: any) => err.code === "VALIDATION_FAILED");
  });
});

describe("ReviewGateAdapter", () => {
  runReviewGateContractTests(async () => {
    const fixture = loadFixtureGates();
    const store = new MockStore(undefined, { review_gates: fixture });
    return new ReviewGateAdapter(store);
  });

  it("should reject plan if IntentVerifier fails", async () => {
    const store = new MockStore();
    const verifier = new MockIntentVerifier(false); // Reject all
    const adapter = new ReviewGateAdapter(store, verifier);

    await assert.rejects(async () => {
      await adapter.submitPlan("p1", "plan", ["file.ts"]);
    }, (err: any) => err.code === "VALIDATION_FAILED" && err.message.includes("Intent Mismatch"));
  });

  it("should reject plan when store resource is not acknowledged", async () => {
    const store = new MockStore();
    const adapter = new ReviewGateAdapter(store);

    await assert.rejects(async () => {
      await adapter.submitPlan("p2", "## Plan\n- [ ] Update locks\n", ["store.ts"]);
    }, (err: any) => err.code === "VALIDATION_FAILED" && err.message.includes("store"));
  });
});
