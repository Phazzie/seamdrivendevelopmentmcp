/**
 * Purpose: Verify scheduler (divvy_work) contract compliance.
 */
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { MockScheduler } from "../../src/lib/mocks/scheduler.mock.js";
import { SchedulerAdapter } from "../../src/lib/adapters/scheduler.adapter.js";
import {
  SchedulerFixtureSchema,
  SchedulerResultSchema,
} from "../../contracts/scheduler.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "scheduler", "default.json");

test("Scheduler Contract - Mock", async () => {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const fixture = SchedulerFixtureSchema.parse(JSON.parse(raw));
  const scenario = fixture.scenarios.basic;

  const mock = new MockScheduler({ scenario: "basic" }, FIXTURE_PATH);
  const result = await mock.schedule(scenario.input);

  assert.deepStrictEqual(result, scenario.expected);
  assert.doesNotThrow(() => SchedulerResultSchema.parse(result));
});

test("Scheduler Contract - Adapter", async () => {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const fixture = SchedulerFixtureSchema.parse(JSON.parse(raw));
  const scenario = fixture.scenarios.basic;

  const adapter = new SchedulerAdapter();
  const result = await adapter.schedule(scenario.input);

  assert.deepStrictEqual(result, scenario.expected);
  assert.doesNotThrow(() => SchedulerResultSchema.parse(result));
});
