import fs from "fs";
import path from "path";
import type { IStatusReader, StatusSnapshot } from "../../../contracts/status.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "status", "snapshot.json");

function loadFixture(): StatusSnapshot {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as StatusSnapshot & { captured_at?: string };
  const { captured_at, ...rest } = parsed;
  return rest as StatusSnapshot;
}

export class MockStatusReader implements IStatusReader {
  async getStatus(): Promise<StatusSnapshot> {
    return loadFixture();
  }
}
