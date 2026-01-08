/**
 * Purpose: Mock implementation for plan_parser using fixtures.
 */
import fs from "fs";
import path from "path";
import {
  IPlanParser,
  PlanParserFixture,
  PlanParserFixtureSchema,
  PlanParserInput,
  PlanParserResult,
} from "../../../contracts/plan_parser.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "plan_parser", "default.json");
const DEFAULT_SCENARIO = "basic";

type MockOptions = {
  scenario?: string;
};

function loadFixture(fixturePath: string): PlanParserFixture {
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Plan parser fixture not found: ${fixturePath}`);
  }
  const raw = fs.readFileSync(fixturePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const result = PlanParserFixtureSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid plan parser fixture: ${result.error.message}`);
  }
  return result.data;
}

export class MockPlanParser implements IPlanParser {
  private scenario: string;
  private fixture: PlanParserFixture;

  constructor(options: MockOptions = {}, fixturePath: string = FIXTURE_PATH) {
    this.scenario = options.scenario ?? DEFAULT_SCENARIO;
    this.fixture = loadFixture(fixturePath);
  }

  async parse(input: PlanParserInput): Promise<PlanParserResult> {
    const scenario = this.fixture.scenarios[this.scenario];
    if (!scenario) {
      throw new Error(`Unknown plan parser scenario: ${this.scenario}`);
    }
    if (scenario.input.markdown !== input.markdown) {
      throw new Error("Plan parser input does not match fixture scenario.");
    }
    return JSON.parse(JSON.stringify(scenario.expected)) as PlanParserResult;
  }
}
