/**
 * Purpose: Verify Scaffolder contract compliance (scaffolder seam).
 */
import assert from "node:assert";
import test from "node:test";
import { MockScaffolder } from "../../src/lib/mocks/scaffolder.mock.js";
import type { IScaffolder } from "../../contracts/scaffolder.contract.js";
import { ScaffoldInputSchema, ScaffoldSpecSchema } from "../../contracts/scaffolder.contract.js";

type ScaffolderTestOptions = {
  baseDir?: string;
};

export function runScaffolderContractTests(
  createScaffolder: () => Promise<IScaffolder>,
  options: ScaffolderTestOptions = {}
) {
  test("Scaffolder Contract - Valid Input", async () => {
    const scaffolder = await createScaffolder();
    const input = ScaffoldInputSchema.parse({
      seamName: "test_seam",
      baseDir: options.baseDir
    });
    
    const result = await scaffolder.scaffold(input);
    
    assert.strictEqual(result.success, true);
    assert.ok(result.files.length >= 6);
    assert.ok(result.files.find(f => f.type === "contract"));
  });

  test("Scaffolder Contract - Validation", () => {
    assert.throws(() => ScaffoldInputSchema.parse({ seamName: "Invalid Name" }));
  });

  test("Scaffolder Contract - Spec Validation", () => {
    const spec = ScaffoldSpecSchema.parse({
      seamName: "spec_seam",
      methods: [{ name: "create", inputType: "CreateInput", outputType: "CreateResult" }]
    });
    const input = ScaffoldInputSchema.parse({ seamName: "spec_seam", spec });
    assert.strictEqual(input.spec?.seamName, "spec_seam");
  });
}

runScaffolderContractTests(async () => new MockScaffolder());
