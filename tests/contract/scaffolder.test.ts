/**
 * Purpose: Verify Scaffolder contract compliance (scaffolder seam).
 */
import assert from "node:assert";
import test from "node:test";
import { MockScaffolder } from "../../src/lib/mocks/scaffolder.mock.js";
import { ScaffoldInputSchema } from "../../contracts/scaffolder.contract.js";

test("Scaffolder Contract - Valid Input", async () => {
  const scaffolder = new MockScaffolder();
  const input = ScaffoldInputSchema.parse({ seamName: "test_seam" });
  
  const result = await scaffolder.scaffold(input);
  
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.files.length, 6);
  assert.ok(result.files.find(f => f.type === "contract"));
});

test("Scaffolder Contract - Validation", () => {
  assert.throws(() => ScaffoldInputSchema.parse({ seamName: "Invalid Name" }));
});
