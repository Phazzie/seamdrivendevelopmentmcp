import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import path from "path";
import type { IArbitration } from "../../contracts/arbitration.contract.js";
import { MockArbitration } from "../../src/lib/mocks/arbitration.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "arbitration", "sample.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "arbitration", "fault.json");

export function runArbitrationContractTests(createArbitration: () => Promise<IArbitration>) {
  describe("Arbitration Contract", () => {
    let arb: IArbitration;

    beforeEach(async () => {
      arb = await createArbitration();
    });

    it("should start idle", async () => {
      const state = await arb.getState();
      assert.strictEqual(state.status, "idle");
    });

    it("should request, grant, and release the gavel", async () => {
      await arb.request("agent-1");
      let state = await arb.getState();
      assert.strictEqual(state.status, "requested");

      await arb.grant("agent-2");
      state = await arb.getState();
      assert.strictEqual(state.status, "granted");

      await arb.release();
      state = await arb.getState();
      assert.strictEqual(state.status, "idle");
    });
  });
}

describe("MockArbitration", () => {
  runArbitrationContractTests(async () => new MockArbitration(FIXTURE_PATH));

  it("should fail when loading fault fixture (no_gavel_active)", async () => {
    const mock = new MockArbitration(FAULT_PATH, "no_gavel_active");
    await assert.rejects(async () => {
      await mock.getState();
    }, (err: any) => err.code === "LOCKED" && err.message.includes("Gavel is not currently active"));
  });
});