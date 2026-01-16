/**
 * Purpose: Mock implementation for test_seam using fixtures.
 */
import fs from "fs";
import path from "path";
import { AppError } from "../../../contracts/store.contract.js";
import type { ITestSeam } from "../../../contracts/test_seam.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "test_seam", "sample.json");

type ScenarioFixture = {
  outputs?: Record<string, unknown>;
  error?: { code: string; message: string; details?: Record<string, unknown> };
};

type FixtureFile = {
  captured_at?: string;
  scenarios?: Record<string, ScenarioFixture>;
};

function loadFixture(): FixtureFile {
  if (!fs.existsSync(FIXTURE_PATH)) return {};
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  return JSON.parse(raw) as FixtureFile;
}

export class MockTestSeam implements ITestSeam {
  private readonly fixture: FixtureFile;

  constructor(private scenario = "success") {
    this.fixture = loadFixture();
  }

  private getScenario(): ScenarioFixture {
    const scenarios = this.fixture.scenarios ?? {};
    const scenario = scenarios[this.scenario];
    if (!scenario) {
      throw new AppError("VALIDATION_FAILED", `Unknown scenario: ${this.scenario}`);
    }
    if (scenario.error) {
      throw new AppError(
        scenario.error.code as any,
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

  // TODO: implement contract methods
}
