/**
 * Purpose: Verify build_plan contract compliance.
 */
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { MockBuildPlan } from "../../src/lib/mocks/build_plan.mock.js";
import { BuildPlanAdapter } from "../../src/lib/adapters/build_plan.adapter.js";
import {
  BuildPlanFixtureSchema,
  BuildPlanResultSchema,
} from "../../contracts/build_plan.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "build_plan", "default.json");

test("BuildPlan Contract - Basic", async () => {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const fixture = BuildPlanFixtureSchema.parse(JSON.parse(raw));
  const scenario = fixture.scenarios.basic;

  const mock = new MockBuildPlan({ scenario: "basic" }, FIXTURE_PATH);
  const result = await mock.build(scenario.input);

  assert.deepStrictEqual(result, scenario.expected);
  assert.doesNotThrow(() => BuildPlanResultSchema.parse(result));
});

test("BuildPlan Contract - Adapter", async () => {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const fixture = BuildPlanFixtureSchema.parse(JSON.parse(raw));
  const scenario = fixture.scenarios.basic;

  const adapter = new BuildPlanAdapter();
  const result = await adapter.build(scenario.input);

  assert.strictEqual(result.markdown, scenario.expected.markdown);
  assert.doesNotThrow(() => BuildPlanResultSchema.parse(result));
});
