/**
 * Purpose: Mock implementation for build_plan using fixtures.
 */
import fs from "fs";
import path from "path";
import {
  BuildPlanFixture,
  BuildPlanFixtureSchema,
  BuildPlanInput,
  BuildPlanResult,
  IBuildPlan,
} from "../../../contracts/build_plan.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "build_plan", "default.json");
const DEFAULT_SCENARIO = "basic";

type MockOptions = {
  scenario?: string;
};

function loadFixture(fixturePath: string): BuildPlanFixture {
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Build plan fixture not found: ${fixturePath}`);
  }
  const raw = fs.readFileSync(fixturePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const result = BuildPlanFixtureSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid build plan fixture: ${result.error.message}`);
  }
  return result.data;
}

export class MockBuildPlan implements IBuildPlan {
  private scenario: string;
  private fixture: BuildPlanFixture;

  constructor(options: MockOptions = {}, fixturePath: string = FIXTURE_PATH) {
    this.scenario = options.scenario ?? DEFAULT_SCENARIO;
    this.fixture = loadFixture(fixturePath);
  }

  async build(input: BuildPlanInput): Promise<BuildPlanResult> {
    const scenario = this.fixture.scenarios[this.scenario];
    if (!scenario) {
      throw new Error(`Unknown build plan scenario: ${this.scenario}`);
    }
    if (JSON.stringify(scenario.input) !== JSON.stringify(input)) {
      throw new Error("Build plan input does not match fixture scenario.");
    }
    return JSON.parse(JSON.stringify(scenario.expected)) as BuildPlanResult;
  }
}
