import { randomUUID } from "crypto";
import type { ITaskRegistry, Task, TaskStatus } from "../../../contracts/tasks.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import type { IStore, PersistedStore } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";

export class TaskAdapter implements ITaskRegistry {
  constructor(private readonly store: IStore) {}

  async create(title: string, description: string, assignee?: string): Promise<Task> {
    return runTransaction(this.store, (current) => {
      const now = Date.now();
      const task: Task = {
        id: randomUUID(),
        title,
        description,
        status: "todo",
        assignee,
        blockedBy: [],
        created_at: now,
        updated_at: now
      };

      const tasks = normalizeTasks((current.tasks as TaskRecord[]) || []);
      
      return {
        nextState: { ...current, tasks: [...tasks, task] },
        result: task
      };
    });
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return runTransaction(this.store, (current) => {
      const tasks = normalizeTasks((current.tasks as TaskRecord[]) || []);
      const index = tasks.findIndex(t => t.id === id);
      
      if (index === -1) {
        throw new AppError("VALIDATION_FAILED", `Task ${id} not found`);
      }

      const updatedTask = {
        ...tasks[index],
        status,
        updated_at: Date.now()
      };

      const nextTasks = [...tasks];
      nextTasks[index] = updatedTask;

      return {
        nextState: { ...current, tasks: nextTasks },
        result: updatedTask
      };
    });
  }

  async list(status?: TaskStatus): Promise<Task[]> {
    const current = await this.store.load();
    const tasks = normalizeTasks((current.tasks as TaskRecord[]) || []);
    if (status) {
      return tasks.filter(t => t.status === status);
    }
    return tasks;
  }
}

type TaskRecord = Task & { blockedBy?: string[] };

function normalizeTasks(tasks: TaskRecord[]): Task[] {
  return tasks.map((task) => ({
    ...task,
    blockedBy: Array.isArray(task.blockedBy) ? task.blockedBy : [],
  }));
}
