import { describe, it } from "node:test";
import assert from "node:assert";
import path from "path";
import type { IIntegrationSnapshotReader } from "../../contracts/integration_snapshot.contract.js";
import { MockIntegrationSnapshotReader } from "../../src/lib/mocks/integration_snapshot.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "integration_snapshot", "snapshot.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "integration_snapshot", "fault.json");

export function runIntegrationSnapshotContractTests(create: () => Promise<IIntegrationSnapshotReader>) {
  describe("Integration Snapshot Contract", () => {
    it("should return a valid snapshot", async () => {
      const reader = await create();
      const snapshot = await reader.getSnapshot();
      assert.ok(snapshot.captured_at);
    });
  });
}

describe("MockIntegrationSnapshotReader", () => {
  runIntegrationSnapshotContractTests(async () => new MockIntegrationSnapshotReader(FIXTURE_PATH));

  it("should fail on fault fixture (snapshot_failed)", async () => {
    const mock = new MockIntegrationSnapshotReader(FAULT_PATH, "snapshot_failed");
    await assert.rejects(async () => {
      await mock.getSnapshot();
    }, (err: any) => err.code === "INTERNAL_ERROR" && err.message.includes("capture integration snapshot"));
  });
});
