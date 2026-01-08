/**
 * Purpose: Verify arbitration (gavel) contract compliance.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { IArbitration } from "../../contracts/arbitration.contract.js";
import { MockArbitration } from "../../src/lib/mocks/arbitration.mock.js";
import { ArbitrationAdapter } from "../../src/lib/adapters/arbitration.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";

export function runArbitrationContractTests(createArbitration: () => Promise<IArbitration>) {
  describe("Arbitration Contract", () => {
    let arbitration: IArbitration;

    beforeEach(async () => {
      arbitration = await createArbitration();
    });

    it("should start idle", async () => {
      const state = await arbitration.getState();
      assert.strictEqual(state.status, "idle");
    });

    it("should request, grant, and release the gavel", async () => {
      const requested = await arbitration.request("codex");
      assert.strictEqual(requested.status, "requested");
      assert.strictEqual(requested.requestedBy, "codex");

      const granted = await arbitration.grant("codex");
      assert.strictEqual(granted.status, "granted");
      assert.strictEqual(granted.grantedTo, "codex");

      const released = await arbitration.release();
      assert.strictEqual(released.status, "idle");
    });
  });
}

describe("MockArbitration", () => {
  runArbitrationContractTests(async () => new MockArbitration());
});

describe("ArbitrationAdapter", () => {
  runArbitrationContractTests(async () => {
    const store = new MockStore();
    return new ArbitrationAdapter(store);
  });
});
