import fs from "fs";
import type { ITaskRegistry, Task, TaskStatus } from "../../../contracts/tasks.contract.js";
import { AppError } from "../../../contracts/store.contract.js";

type TaskFixture = {
  captured_at?: string;
  tasks?: Task[];
};

export class MockTaskRegistry implements ITaskRegistry {
  private tasks: Task[];
  private clock: number;
  private idIndex: number;

  constructor(private readonly fixturePath: string) {
    this.tasks = this.loadFixtureTasks(fixturePath);
    const times = this.tasks.flatMap((task) => [task.created_at, task.updated_at]);
    const maxTime = times.length ? Math.max(...times) : 1700000002000;
    this.clock = Math.max(1700000002000, maxTime + 1);
    this.idIndex = 1;
  }

  private loadFixtureTasks(fixturePath: string): Task[] {
    if (!fs.existsSync(fixturePath)) return [];
    const raw = fs.readFileSync(fixturePath, "utf-8");
    const parsed = JSON.parse(raw) as TaskFixture;
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    return tasks.map((task) => ({
      ...task,
      blockedBy: Array.isArray(task.blockedBy) ? task.blockedBy : [],
    }));
  }

  async create(title: string, description: string, assignee?: string): Promise<Task> {
    const task: Task = {
      id: this.nextId(),
      title,
      description,
      status: "todo",
      assignee,
      blockedBy: [],
      created_at: this.nextTime(),
      updated_at: this.nextTime()
    };
    this.tasks.push(task);
    return task;
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const task = this.tasks.find(t => t.id === id);
    if (!task) {
      throw new AppError("VALIDATION_FAILED", `Task ${id} not found`);
    }
    task.status = status;
    task.updated_at = this.nextTime();
    return task;
  }

  async list(status?: TaskStatus): Promise<Task[]> {
    const tasks = status ? this.tasks.filter(t => t.status === status) : [...this.tasks];
    return tasks.sort((a, b) => b.updated_at - a.updated_at);
  }

  private nextTime(): number {
    const value = this.clock;
    this.clock += 1;
    return value;
  }

  private nextId(): string {
    const value = this.idIndex.toString(16).padStart(12, "0");
    this.idIndex += 1;
    return `00000000-0000-0000-0000-${value}`;
  }
}