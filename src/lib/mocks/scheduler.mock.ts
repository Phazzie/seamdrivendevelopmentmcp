/**
 * Purpose: Mock implementation for scheduler using fixtures.
 */
import fs from "fs";
import path from "path";
import {
  IScheduler,
  SchedulerFixture,
  SchedulerFixtureSchema,
  SchedulerInput,
  SchedulerResult,
} from "../../../contracts/scheduler.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "scheduler", "default.json");
const DEFAULT_SCENARIO = "basic";

type MockOptions = {
  scenario?: string;
};

function loadFixture(fixturePath: string): SchedulerFixture {
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Scheduler fixture not found: ${fixturePath}`);
  }
  const raw = fs.readFileSync(fixturePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const result = SchedulerFixtureSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid scheduler fixture: ${result.error.message}`);
  }
  return result.data;
}

export class MockScheduler implements IScheduler {
  private scenario: string;
  private fixture: SchedulerFixture;

  constructor(options: MockOptions = {}, fixturePath: string = FIXTURE_PATH) {
    this.scenario = options.scenario ?? DEFAULT_SCENARIO;
    this.fixture = loadFixture(fixturePath);
  }

  async schedule(input: SchedulerInput): Promise<SchedulerResult> {
    const scenario = this.fixture.scenarios[this.scenario];
    if (!scenario) {
      throw new Error(`Unknown scheduler scenario: ${this.scenario}`);
    }
    if (JSON.stringify(scenario.input) !== JSON.stringify(input)) {
      throw new Error("Scheduler input does not match fixture scenario.");
    }
    return JSON.parse(JSON.stringify(scenario.expected)) as SchedulerResult;
  }
}
