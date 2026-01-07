import fs from "fs";
import path from "path";
import type { ITaskRegistry, Task, TaskStatus } from "../../../contracts/tasks.contract.js";
import { AppError } from "../../../contracts/store.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "tasks", "sample.json");
const BASE_TIME = 1700000002000;

type TaskFixture = {
  captured_at?: string;
  tasks?: Task[];
};

function loadFixtureTasks(): Task[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as TaskFixture;
  return Array.isArray(parsed.tasks) ? parsed.tasks : [];
}

export class MockTaskRegistry implements ITaskRegistry {
  private tasks: Task[];
  private clock: number;
  private idIndex: number;

  constructor() {
    this.tasks = loadFixtureTasks();
    const times = this.tasks.flatMap((task) => [task.created_at, task.updated_at]);
    const maxTime = times.length ? Math.max(...times) : BASE_TIME;
    this.clock = Math.max(BASE_TIME, maxTime + 1);
    this.idIndex = 1;
  }

  async create(title: string, description: string, assignee?: string): Promise<Task> {
    const task: Task = {
      id: this.nextId(),
      title,
      description,
      status: "todo",
      assignee,
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
    if (status) {
      return this.tasks.filter(t => t.status === status);
    }
    return [...this.tasks];
  }

  private nextTime(): number {
    const value = this.clock;
    this.clock += 1;
    return value;
  }

  private nextId(): string {
    // Deterministic, collision-free IDs for tests.
    const value = this.idIndex.toString(16).padStart(12, "0");
    this.idIndex += 1;
    return `00000000-0000-0000-0000-${value}`;
  }
}
