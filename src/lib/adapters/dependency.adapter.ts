import type { IDependencyManager } from "../../../contracts/dependency.contract.js";
import type { Task, TaskStatus } from "../../../contracts/tasks.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import type { IStore } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";

type TaskRecord = Task & { blockedBy?: string[] };

export class DependencyAdapter implements IDependencyManager {
  constructor(private readonly store: IStore) {}

  async addDependency(childId: string, parentId: string): Promise<Task> {
    if (childId === parentId) {
      throw new AppError("VALIDATION_FAILED", "Task cannot depend on itself.");
    }

    return runTransaction(this.store, (current) => {
      const tasks = normalizeTasks((current.tasks as TaskRecord[]) || []);
      const childIndex = tasks.findIndex((task) => task.id === childId);
      const parent = tasks.find((task) => task.id === parentId);

      if (childIndex === -1) {
        throw new AppError("VALIDATION_FAILED", `Task ${childId} not found`);
      }
      if (!parent) {
        throw new AppError("VALIDATION_FAILED", `Task ${parentId} not found`);
      }

      const blockedBy = new Set(tasks[childIndex].blockedBy);
      blockedBy.add(parentId);

      const updated = {
        ...tasks[childIndex],
        blockedBy: Array.from(blockedBy),
        updated_at: Date.now(),
      };

      const nextTasks = [...tasks];
      nextTasks[childIndex] = updated;

      return {
        nextState: { ...current, tasks: nextTasks },
        result: updated,
      };
    });
  }

  async removeDependency(childId: string, parentId: string): Promise<Task> {
    return runTransaction(this.store, (current) => {
      const tasks = normalizeTasks((current.tasks as TaskRecord[]) || []);
      const childIndex = tasks.findIndex((task) => task.id === childId);

      if (childIndex === -1) {
        throw new AppError("VALIDATION_FAILED", `Task ${childId} not found`);
      }

      const blockedBy = tasks[childIndex].blockedBy.filter((id) => id !== parentId);
      const updated = {
        ...tasks[childIndex],
        blockedBy,
        updated_at: Date.now(),
      };

      const nextTasks = [...tasks];
      nextTasks[childIndex] = updated;

      return {
        nextState: { ...current, tasks: nextTasks },
        result: updated,
      };
    });
  }

  async getDependencies(taskId: string) {
    const current = await this.store.load();
    const tasks = normalizeTasks((current.tasks as TaskRecord[]) || []);
    const task = tasks.find((entry) => entry.id === taskId);

    if (!task) {
      throw new AppError("VALIDATION_FAILED", `Task ${taskId} not found`);
    }

    return {
      taskId: task.id,
      blockedBy: task.blockedBy,
    };
  }

  async listActionable(status?: TaskStatus): Promise<Task[]> {
    const current = await this.store.load();
    const tasks = normalizeTasks((current.tasks as TaskRecord[]) || []);
    const statusFilter = status ?? "todo";
    const byId = new Map(tasks.map((task) => [task.id, task]));

    return tasks.filter((task) => {
      if (statusFilter && task.status !== statusFilter) return false;

      return task.blockedBy.every((dependencyId) => {
        const dependency = byId.get(dependencyId);
        return dependency?.status === "done";
      });
    });
  }
}

function normalizeTasks(tasks: TaskRecord[]): Task[] {
  return tasks.map((task) => ({
    ...task,
    blockedBy: Array.isArray(task.blockedBy) ? task.blockedBy : [],
  }));
}
