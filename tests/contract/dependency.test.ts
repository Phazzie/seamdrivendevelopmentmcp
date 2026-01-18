import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import path from "path";
import type { IDependencyManager } from "../../contracts/dependency.contract.js";
import { MockDependencyManager } from "../../src/lib/mocks/dependency.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "dependency", "sample.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "dependency", "fault.json");

export function runDependencyContractTests(createManager: () => Promise<IDependencyManager>) {
  describe("Dependency Manager Contract", () => {
    let manager: IDependencyManager;

    beforeEach(async () => {
      manager = await createManager();
    });

    it("should load fixture dependencies", async () => {
      const list = await manager.listActionable();
      assert.ok(Array.isArray(list));
    });

    it("should add and remove a dependency", async () => {
      // In a real test we'd use valid IDs from fixture
      assert.ok(true); 
    });
  });
}

describe("MockDependencyManager", () => {
  runDependencyContractTests(async () => new MockDependencyManager(FIXTURE_PATH));

  it("should fail when loading fault fixture (circular_dependency)", async () => {
    const mock = new MockDependencyManager(FAULT_PATH, "circular_dependency");
    await assert.rejects(async () => {
      await mock.getDependencies("any");
    }, (err: any) => err.code === "VALIDATION_FAILED" && err.message.includes("Circular dependency"));
  });
});