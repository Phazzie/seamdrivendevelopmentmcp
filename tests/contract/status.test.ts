import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import path from "path";
import type { IStatusReader } from "../../contracts/status.contract.js";
import { MockStatusReader } from "../../src/lib/mocks/status.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "status", "snapshot.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "status", "fault.json");

export function runStatusContractTests(createReader: () => Promise<IStatusReader>) {
  describe("Status Snapshot Contract", () => {
    let reader: IStatusReader;

    beforeEach(async () => {
      reader = await createReader();
    });

    it("should return a status snapshot", async () => {
      const snapshot = await reader.getStatus();
      assert.ok(snapshot.revision);
      assert.strictEqual(typeof snapshot.panicMode, "boolean");
    });
  });
}

describe("MockStatusReader", () => {
  runStatusContractTests(async () => new MockStatusReader(FIXTURE_PATH));

  it("should fail when loading fault fixture (status_timeout)", async () => {
    const mock = new MockStatusReader(FAULT_PATH, "status_timeout");
    await assert.rejects(async () => {
      await mock.getStatus();
    }, (err: any) => err.code === "INTERNAL_ERROR" && err.message.includes("Timed out"));
  });
});