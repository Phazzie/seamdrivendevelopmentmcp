import fs from "fs";
import { IProbeRunner, RunProbesInput, ProbeResult } from "../../../contracts/probe_runner.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";

export class MockProbeRunner implements IProbeRunner {
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

  async run(input: RunProbesInput): Promise<ProbeResult[]> {
    const s = this.getScenario();
    return s.outputs?.results || [];
  }
}