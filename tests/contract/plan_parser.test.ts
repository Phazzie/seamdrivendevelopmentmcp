/**
 * Purpose: Verify plan_parser contract compliance.
 */
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { MockPlanParser } from "../../src/lib/mocks/plan_parser.mock.js";
import { PlanParserAdapter } from "../../src/lib/adapters/plan_parser.adapter.js";
import {
  PlanParserFixtureSchema,
  PlanParserResultSchema,
} from "../../contracts/plan_parser.contract.js";
import { TaskSchema } from "../../contracts/tasks.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "plan_parser", "default.json");

test("PlanParser Contract - Basic", async () => {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const fixture = PlanParserFixtureSchema.parse(JSON.parse(raw));
  const scenario = fixture.scenarios.basic;

  const mock = new MockPlanParser({ scenario: "basic" }, FIXTURE_PATH);
  const result = await mock.parse(scenario.input);

  assert.deepStrictEqual(result, scenario.expected);
  assert.doesNotThrow(() => PlanParserResultSchema.parse(result));
});

test("PlanParser Contract - Adapter", async () => {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const fixture = PlanParserFixtureSchema.parse(JSON.parse(raw));
  const scenario = fixture.scenarios.basic;
  const expectedTasks = scenario.expected.tasks;

  const adapter = new PlanParserAdapter();
  const result = await adapter.parse(scenario.input);

  assert.strictEqual(result.tasks.length, expectedTasks.length);
  result.tasks.forEach((task, index) => {
    assert.strictEqual(task.title, expectedTasks[index].title);
    assert.strictEqual(task.description, expectedTasks[index].description);
    assert.strictEqual(task.status, "todo");
    assert.doesNotThrow(() => TaskSchema.parse(task));
  });
});
