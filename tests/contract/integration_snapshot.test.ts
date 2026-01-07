// Purpose: contract tests for integration snapshot (integration_snapshot seam).
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import type {
  IIntegrationSnapshotReader,
  IntegrationSnapshot,
} from "../../contracts/integration_snapshot.contract.js";
import { IntegrationSnapshotSchema } from "../../contracts/integration_snapshot.contract.js";
import { MockIntegrationSnapshotReader } from "../../src/lib/mocks/integration_snapshot.mock.js";

const FIXTURE_PATH = path.join(
  process.cwd(),
  "fixtures",
  "integration_snapshot",
  "snapshot.json"
);

function loadFixture(): IntegrationSnapshot | null {
  if (!fs.existsSync(FIXTURE_PATH)) return null;
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  return JSON.parse(raw) as IntegrationSnapshot;
}

export function runIntegrationSnapshotContractTests(
  createReader: () => Promise<IIntegrationSnapshotReader>
) {
  describe("Integration Snapshot Contract", () => {
    let reader: IIntegrationSnapshotReader;

    beforeEach(async () => {
      reader = await createReader();
    });

    it("should return a valid snapshot", async () => {
      const snapshot = await reader.getSnapshot();
      const parsed = IntegrationSnapshotSchema.safeParse(snapshot);
      assert.strictEqual(parsed.success, true);
    });

    it("should load fixture snapshot when present", async () => {
      const fixture = loadFixture();
      if (!fixture) return;
      const snapshot = await reader.getSnapshot();
      assert.strictEqual(snapshot.store.revision, fixture.store.revision);
      assert.strictEqual(snapshot.store_path, fixture.store_path);
    });
  });
}

describe("MockIntegrationSnapshotReader", () => {
  runIntegrationSnapshotContractTests(async () => new MockIntegrationSnapshotReader());
});
