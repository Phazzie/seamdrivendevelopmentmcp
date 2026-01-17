/**
 * Purpose: Verify sdd_tracking contract compliance.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { ISddTracking } from "../../contracts/sdd_tracking.contract.js";
import { MockSddTracking } from "../../src/lib/mocks/sdd_tracking.mock.js";

import { SddTrackingAdapter } from "../../src/lib/adapters/sdd_tracking.adapter.js";

export function runSddTrackingContractTests(createAdapter: () => Promise<ISddTracking>) {
  describe("SddTracking Contract", () => {
    let adapter: ISddTracking;

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    it("should satisfy contract scenarios", async () => {
      const report = await adapter.getReport();
      assert.ok(report);
      assert.strictEqual(typeof report.overallScore, "number");
      assert.strictEqual(typeof report.isHealthy, "boolean");
      assert.ok(Array.isArray(report.seams));
    });
  });
}

describe("MockSddTracking", () => {
  runSddTrackingContractTests(async () => new MockSddTracking());
});

describe("SddTrackingAdapter", () => {
  runSddTrackingContractTests(async () => new SddTrackingAdapter(process.cwd()));
});
