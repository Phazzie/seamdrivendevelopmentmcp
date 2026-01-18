import fs from "fs";
import type { IStatusReader, StatusSnapshot } from "../../../contracts/status.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";

export class MockStatusReader implements IStatusReader {
  private fixture: any = {};

  constructor(private readonly fixturePath: string, private readonly scenario = "success") {
    if (fs.existsSync(fixturePath)) {
      this.fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    }
  }

  private getScenario(): any {
    const scenarios = this.fixture.scenarios ?? {};
    const scenario = scenarios[this.scenario] || scenarios["success"] || { outputs: this.fixture };
    if (scenario.error) {
      const code = AppErrorCodeSchema.parse(scenario.error.code);
      throw new AppError(code, scenario.error.message);
    }
    return scenario;
  }

  async getStatus(): Promise<StatusSnapshot> {
    const s = this.getScenario();
    const data = s.data || s.outputs || this.fixture;
    const { captured_at, ...rest } = data;
    return rest as StatusSnapshot;
  }
}