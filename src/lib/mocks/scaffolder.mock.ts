import fs from "fs";
import { AppError } from "../../../contracts/store.contract.js";
import { IScaffolder, ScaffoldInput, ScaffoldResult } from "../../../contracts/scaffolder.contract.js";

export class MockScaffolder implements IScaffolder {
  private fixture: any = {};

  constructor(private readonly fixturePath: string, private readonly scenario = "success") {
    if (fs.existsSync(fixturePath)) {
      this.fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    }
  }

  private getScenario() {
    const scenarios = this.fixture.scenarios ?? {};
    const s = scenarios[this.scenario] || scenarios["success"] || {};
    if (s.error) throw new AppError(s.error.code, s.error.message);
    return s;
  }

  async scaffold(input: ScaffoldInput): Promise<ScaffoldResult> {
    const s = this.getScenario();
    const output = s.outputs?.scaffold || { success: true, files: [] };
    return output;
  }
}