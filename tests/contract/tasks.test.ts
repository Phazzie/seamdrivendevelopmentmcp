import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import type { ITaskRegistry, Task } from "../../contracts/tasks.contract.js";
import { MockTaskRegistry } from "../../src/lib/mocks/tasks.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "tasks", "sample.json");

function loadFixtureTasks(): Task[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  // Fix: Handle probe output structure
  const s = parsed.scenarios?.success || parsed;
  const outputs = s.outputs || s;
  return Array.isArray(outputs.tasks) ? outputs.tasks : [];
}

export function runTaskContractTests(createRegistry: () => Promise<ITaskRegistry>) {
  describe("Task Registry Contract", () => {
    let tasks: ITaskRegistry;

    beforeEach(async () => {
      tasks = await createRegistry();
    });

    it("should load fixture tasks when present", async () => {
      const fixtureTasks = loadFixtureTasks();
      const list = await tasks.list();
      assert.strictEqual(list.length, fixtureTasks.length);
    });

    it("should create a task with default status 'todo'", async () => {
      const task = await tasks.create("Fix Bug", "Null pointer in auth");
      assert.strictEqual(task.title, "Fix Bug");
      assert.strictEqual(task.status, "todo");
    });

    it("should list tasks filtering by status", async () => {
      const t1 = await tasks.create("T1", "D1");
      const t2 = await tasks.create("T2", "D2");
      await tasks.updateStatus(t2.id, "done");

      const todoList = await tasks.list("todo");
      assert.ok(todoList.find((task) => task.id === t1.id));
    });

    it("should fail to update non-existent task", async () => {
      await assert.rejects(async () => {
        await tasks.updateStatus("fake-id", "done");
      }, (err: any) => err.code === "VALIDATION_FAILED");
    });
  });
}

describe("MockTaskRegistry", () => {
  runTaskContractTests(async () => new MockTaskRegistry(FIXTURE_PATH));
});