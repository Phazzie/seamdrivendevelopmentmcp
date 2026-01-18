import fs from "fs";
import type { IIntegrationSnapshotReader, IntegrationSnapshot } from "../../../contracts/integration_snapshot.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";

export class MockIntegrationSnapshotReader implements IIntegrationSnapshotReader {
  private fixture: any = {};

  constructor(private readonly fixturePath: string, private readonly scenario = "success") {
    if (fs.existsSync(fixturePath)) {
      this.fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    }
  }

  private getScenario(): any {
    const scenarios = this.fixture.scenarios ?? {};
    const s = scenarios[this.scenario] || scenarios["success"] || { outputs: this.fixture };
    if (s.error) {
      const code = AppErrorCodeSchema.parse(s.error.code);
      throw new AppError(code, s.error.message);
    }
    return s;
  }

  async getSnapshot(): Promise<IntegrationSnapshot> {
    const s = this.getScenario();
    const data = s.data || s.outputs || this.fixture;
    return data as IntegrationSnapshot;
  }
}