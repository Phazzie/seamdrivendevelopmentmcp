/**
 * Purpose: Verify build_plan <-> decompose_plan round-trip integrity.
 */
import assert from "node:assert";
import test from "node:test";
import { PlanParserAdapter } from "../../src/lib/adapters/plan_parser.adapter.js";
import { BuildPlanAdapter } from "../../src/lib/adapters/build_plan.adapter.js";
import type { Task } from "../../contracts/tasks.contract.js";

test("Plan Tools - Round-Trip Verification", async () => {
  const parser = new PlanParserAdapter();
  const builder = new BuildPlanAdapter();

  // 1. Data -> Markdown
  const { markdown } = await builder.build({
    title: "Project Plan",
    sections: [
      {
        title: "Phase 1: Setup",
        items: [
          { text: "Initialize repo", subitems: [] },
          { text: "Add lint config", subitems: [] }
        ]
      }
    ],
    orphanItems: [
      { text: "Global Task", subitems: [] }
    ]
  });

  console.log("GENERATED MARKDOWN:\n", markdown);

  assert.ok(markdown.includes("## Phase 1: Setup"));
  assert.ok(markdown.includes("- [ ] Initialize repo"));
  assert.ok(markdown.includes("- [ ] Global Task"));

  // 2. Markdown -> Tasks
  const { tasks: roundTrippedTasks } = await parser.parse({ markdown });

  // 3. Verify invariants
  assert.strictEqual(roundTrippedTasks.length, 4);
  assert.strictEqual(roundTrippedTasks[0].title, "Phase 1: Setup");
  assert.strictEqual(roundTrippedTasks[1].title, "Initialize repo");
  assert.strictEqual(roundTrippedTasks[2].title, "Add lint config");
  assert.strictEqual(roundTrippedTasks[3].title, "Global Task");
});
