import { describe } from "node:test";
import fs from "fs";
import path from "path";
import { runTaskContractTests } from "./tasks.test.js";
import { TaskAdapter } from "../../src/lib/adapters/tasks.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";
import type { Task } from "../../contracts/tasks.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "tasks", "sample.json");

function loadFixtureTasks(): Task[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  const s = parsed.scenarios?.success || parsed;
  const outputs = s.outputs || s;
  return Array.isArray(outputs.tasks) ? outputs.tasks : [];
}

describe("Real TaskAdapter (with MockStore)", () => {
  runTaskContractTests(async () => {
    const store = new MockStore(undefined, { tasks: loadFixtureTasks() });
    return new TaskAdapter(store);
  });
});