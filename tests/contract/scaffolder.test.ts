import assert from "node:assert";
import { describe, test } from "node:test";
import path from "path";
import type { IScaffolder } from "../../contracts/scaffolder.contract.js";
import { MockScaffolder } from "../../src/lib/mocks/scaffolder.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "scaffolder", "sample.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "scaffolder", "fault.json");

export function runScaffolderContractTests(create: () => Promise<IScaffolder>) {
  test("Scaffolder Contract - Valid Input", async () => {
    const scaffolder = await create();
    const res = await scaffolder.scaffold({ seamName: "any", baseDir: "." });
    assert.ok(res.success);
  });
}

describe("MockScaffolder", () => {
  runScaffolderContractTests(async () => new MockScaffolder(FIXTURE_PATH));

  test("Scaffolder Contract - Fault Injection", async () => {
    const mock = new MockScaffolder(FAULT_PATH, "fs_permission_denied");
    await assert.rejects(async () => {
      await mock.scaffold({ seamName: "any", baseDir: "." });
    }, (err: any) => err.code === "INTERNAL_ERROR" && err.message.includes("permission denied"));
  });
});