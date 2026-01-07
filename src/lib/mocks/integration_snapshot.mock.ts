// Purpose: mock integration snapshot using fixture data (integration_snapshot seam).
import fs from "fs";
import path from "path";
import type {
  IIntegrationSnapshotReader,
  IntegrationSnapshot,
} from "../../../contracts/integration_snapshot.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "integration_snapshot", "snapshot.json");

function loadFixture(): IntegrationSnapshot {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  return JSON.parse(raw) as IntegrationSnapshot;
}

export class MockIntegrationSnapshotReader implements IIntegrationSnapshotReader {
  async getSnapshot(): Promise<IntegrationSnapshot> {
    return loadFixture();
  }
}
