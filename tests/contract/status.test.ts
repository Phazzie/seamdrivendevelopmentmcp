import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { IStatusReader } from "../../contracts/status.contract.js";
import { MockStatusReader } from "../../src/lib/mocks/status.mock.js";

export function runStatusContractTests(createReader: () => Promise<IStatusReader>) {
  describe("Status Snapshot Contract", () => {
    let reader: IStatusReader;

    beforeEach(async () => {
      reader = await createReader();
    });

    it("should return a status snapshot", async () => {
      const snapshot = await reader.getStatus();
      assert.strictEqual(typeof snapshot.revision, "number");
      assert.strictEqual(typeof snapshot.panicMode, "boolean");
      assert.strictEqual(typeof snapshot.lockCount, "number");
      assert.strictEqual(typeof snapshot.taskCount, "number");
      assert.strictEqual(typeof snapshot.messageCount, "number");
      assert.strictEqual(typeof snapshot.agentCount, "number");
      assert.strictEqual(typeof snapshot.uptimeMs, "number");
    });
  });
}

describe("MockStatusReader", () => {
  runStatusContractTests(async () => new MockStatusReader());
});
