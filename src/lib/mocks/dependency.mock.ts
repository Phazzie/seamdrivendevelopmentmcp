import fs from "fs";
import path from "path";
import type { IDependencyManager } from "../../../contracts/dependency.contract.js";
import type { Task, TaskStatus } from "../../../contracts/tasks.contract.js";
import { AppError } from "../../../contracts/store.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "dependency", "sample.json");

type DependencyFixture = {
  captured_at?: string;
  tasks?: Task[];
};

function loadFixtureTasks(): Task[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as DependencyFixture;
  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  return tasks.map((task) => ({
    ...task,
    blockedBy: Array.isArray(task.blockedBy) ? task.blockedBy : [],
  }));
}

export class MockDependencyManager implements IDependencyManager {
  private tasks: Task[];

  constructor() {
    this.tasks = loadFixtureTasks();
  }

  async addDependency(childId: string, parentId: string): Promise<Task> {
    if (childId === parentId) {
      throw new AppError("VALIDATION_FAILED", "Task cannot depend on itself.");
    }

    const child = this.tasks.find((task) => task.id === childId);
    const parent = this.tasks.find((task) => task.id === parentId);

    if (!child) throw new AppError("VALIDATION_FAILED", `Task ${childId} not found`);
    if (!parent) throw new AppError("VALIDATION_FAILED", `Task ${parentId} not found`);

    if (!child.blockedBy.includes(parentId)) {
      child.blockedBy = [...child.blockedBy, parentId];
    }
    child.updated_at = Date.now();
    return child;
  }

  async removeDependency(childId: string, parentId: string): Promise<Task> {
    const child = this.tasks.find((task) => task.id === childId);
    if (!child) throw new AppError("VALIDATION_FAILED", `Task ${childId} not found`);

    child.blockedBy = child.blockedBy.filter((id) => id !== parentId);
    child.updated_at = Date.now();
    return child;
  }

  async getDependencies(taskId: string) {
    const task = this.tasks.find((entry) => entry.id === taskId);
    if (!task) throw new AppError("VALIDATION_FAILED", `Task ${taskId} not found`);

    return {
      taskId: task.id,
      blockedBy: task.blockedBy,
    };
  }

  async listActionable(status?: TaskStatus): Promise<Task[]> {
    const statusFilter = status ?? "todo";
    const byId = new Map(this.tasks.map((task) => [task.id, task]));

    return this.tasks.filter((task) => {
      if (statusFilter && task.status !== statusFilter) return false;

      return task.blockedBy.every((dependencyId) => {
        const dependency = byId.get(dependencyId);
        return dependency?.status === "done";
      });
    });
  }
}
