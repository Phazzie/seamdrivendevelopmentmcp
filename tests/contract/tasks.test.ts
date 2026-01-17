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
  const parsed = JSON.parse(raw) as { tasks?: Task[] };
  return Array.isArray(parsed.tasks) ? parsed.tasks : [];
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
      if (fixtureTasks.length) {
        assert.strictEqual(list.find(t => t.id === fixtureTasks[0].id)?.title, fixtureTasks[0].title);
        assert.ok(Array.isArray(list[0].blockedBy));
      }
    });

    it("should create a task with default status 'todo'", async () => {
      const task = await tasks.create("Fix Bug", "Null pointer in auth");
      assert.strictEqual(task.title, "Fix Bug");
      assert.strictEqual(task.status, "todo");
      assert.deepStrictEqual(task.blockedBy, []);
      assert.ok(task.id);
      assert.ok(task.created_at);
    });

    it("should list tasks filtering by status", async () => {
      const baseline = await tasks.list();
      const baseTodo = baseline.filter((task) => task.status === "todo").length;
      const baseDone = baseline.filter((task) => task.status === "done").length;

      const t1 = await tasks.create("T1", "D1");
      const t2 = await tasks.create("T2", "D2");
      await tasks.updateStatus(t2.id, "done");

      const todoList = await tasks.list("todo");
      const doneList = await tasks.list("done");

      assert.strictEqual(todoList.length, baseTodo + 1);
      assert.ok(todoList.find((task) => task.id === t1.id));
      assert.strictEqual(doneList.length, baseDone + 1);
      assert.ok(doneList.find((task) => task.id === t2.id));
    });

    it("should fail to update non-existent task", async () => {
      await assert.rejects(async () => {
        await tasks.updateStatus("fake-id", "done");
      }, (err: any) => err.code === "VALIDATION_FAILED");
    });

    it("should sort tasks by updated_at descending (newest first)", async () => {
      const t1 = await tasks.create("Old", "Old");
      await new Promise(r => setTimeout(r, 10));
      const t2 = await tasks.create("New", "New"); // Mock ensures t2 has later timestamp
      
      const list = await tasks.list();
      const idx1 = list.findIndex(t => t.id === t1.id);
      const idx2 = list.findIndex(t => t.id === t2.id);
      
      assert.ok(idx2 < idx1, `New task (${t2.id}) should appear before old task (${t1.id})`);
    });
  });
}

describe("MockTaskRegistry", () => {
  runTaskContractTests(async () => new MockTaskRegistry(FIXTURE_PATH));
});