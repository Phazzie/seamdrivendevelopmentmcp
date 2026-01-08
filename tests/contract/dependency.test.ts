import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import type { IDependencyManager } from "../../contracts/dependency.contract.js";
import { MockDependencyManager } from "../../src/lib/mocks/dependency.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "dependency", "sample.json");

type FixtureTask = {
  id: string;
  title: string;
  blockedBy?: string[];
  status: string;
};

type DependencyFixture = {
  tasks?: FixtureTask[];
};

function loadFixtureTasks(): FixtureTask[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as DependencyFixture;
  return Array.isArray(parsed.tasks) ? parsed.tasks : [];
}

describe("Dependency Manager Contract", () => {
  let deps: IDependencyManager;
  let fixtureTasks: FixtureTask[];
  let root: FixtureTask | undefined;
  let child: FixtureTask | undefined;
  let chain: FixtureTask | undefined;

  beforeEach(async () => {
    deps = new MockDependencyManager();
    fixtureTasks = loadFixtureTasks();
    root = fixtureTasks.find((task) => task.title === "Dependency root");
    child = fixtureTasks.find((task) => task.title === "Dependent task");
    chain = fixtureTasks.find((task) => task.title === "Blocked chain");
  });

  it("should load fixture dependencies", async () => {
    assert.ok(root);
    assert.ok(child);
    const info = await deps.getDependencies(child!.id);
    assert.deepStrictEqual(info.blockedBy, [root!.id]);
  });

  it("should add and remove a dependency", async () => {
    assert.ok(root);
    assert.ok(child);
    const updated = await deps.addDependency(child!.id, root!.id);
    assert.ok(updated.blockedBy.includes(root!.id));

    const removed = await deps.removeDependency(child!.id, root!.id);
    assert.ok(!removed.blockedBy.includes(root!.id));
  });

  it("should list actionable tasks", async () => {
    assert.ok(child);
    assert.ok(chain);
    const actionable = await deps.listActionable();
    assert.strictEqual(actionable.length, 1);
    assert.strictEqual(actionable[0].id, child!.id);
  });
});
