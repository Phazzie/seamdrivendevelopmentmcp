/**
 * Purpose: Verify test_seam contract compliance.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { ITestSeam } from "../../contracts/test_seam.contract.js";
import { MockTestSeam } from "../../src/lib/mocks/test_seam.mock.js";

export function runTestSeamContractTests(createAdapter: () => Promise<ITestSeam>) {
  describe("TestSeam Contract", () => {
    let adapter: ITestSeam;

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    it("should satisfy contract scenarios", async () => {
      assert.ok(true); // TODO: add contract assertions
    });
  });
}

describe("MockTestSeam", () => {
  runTestSeamContractTests(async () => new MockTestSeam());
});
