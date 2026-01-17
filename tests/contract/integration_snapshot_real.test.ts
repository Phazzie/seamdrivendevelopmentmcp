// Purpose: run integration snapshot contract tests against real adapter.
import { describe } from "node:test";
import fs from "fs";
import path from "path";
import { IntegrationSnapshotAdapter } from "../../src/lib/adapters/integration_snapshot.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";
import { runIntegrationSnapshotContractTests } from "./integration_snapshot.test.js";
import type { IntegrationSnapshot } from "../../contracts/integration_snapshot.contract.js";

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

describe("Real IntegrationSnapshotAdapter (with MockStore)", () => {
  runIntegrationSnapshotContractTests(async () => {
    const fixture = loadFixture();
    const store = new MockStore(undefined, fixture ? fixture.store : undefined);
    const storePath = fixture ? fixture.store_path : "mock://store";
    return new IntegrationSnapshotAdapter(store, storePath);
  });
});
