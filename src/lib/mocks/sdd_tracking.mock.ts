/**
 * Purpose: Mock implementation for sdd_tracking using fixtures.
 */
import fs from "fs";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";
import type { ISddTracking, SddReport } from "../../../contracts/sdd_tracking.contract.js";

type ScenarioFixture = {
  outputs?: Record<string, unknown>;
  error?: { code: string; message: string; details?: Record<string, unknown> };
};

type FixtureFile = {
  captured_at?: string;
  scenarios?: Record<string, ScenarioFixture>;
};

export class MockSddTracking implements ISddTracking {
  private readonly fixture: FixtureFile;

  constructor(private readonly fixturePath: string, private scenario = "success") {
    if (!fs.existsSync(fixturePath)) {
      this.fixture = {};
    } else {
      const raw = fs.readFileSync(fixturePath, "utf-8");
      this.fixture = JSON.parse(raw) as FixtureFile;
    }
  }

  private getScenario(): ScenarioFixture {
    const scenarios = this.fixture.scenarios ?? {};
    const scenario = scenarios[this.scenario];
    if (!scenario) {
      throw new AppError("VALIDATION_FAILED", `Unknown scenario: ${this.scenario}`);
    }
    if (scenario.error) {
      const code = AppErrorCodeSchema.parse(scenario.error.code);
      throw new AppError(
        code,
        scenario.error.message,
        scenario.error.details
      );
    }
    return scenario;
  }

  private getOutput(method: string): unknown {
    const scenario = this.getScenario();
    if (!scenario.outputs || !(method in scenario.outputs)) {
      throw new AppError("VALIDATION_FAILED", `Missing output for ${method}`);
    }
    return scenario.outputs[method];
  }

  async getReport(): Promise<SddReport> {
    return this.getOutput("getReport") as SddReport;
  }
}