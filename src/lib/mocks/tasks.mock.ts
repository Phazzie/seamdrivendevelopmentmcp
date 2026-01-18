/**
 * Purpose: Mock implementation for tasks using fixtures (tasks seam).
 */
import fs from "fs";
import type { ITaskRegistry, Task, TaskStatus } from "../../../contracts/tasks.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";

type ScenarioFixture = {
  outputs?: any;
  error?: { code: string; message: string; details?: Record<string, unknown> };
};

type FixtureFile = {
  captured_at?: string;
  tasks?: any[];
  scenarios?: Record<string, ScenarioFixture>;
};

export class MockTaskRegistry implements ITaskRegistry {
  private tasks: Task[] = [];
  private clock: number;
  private idIndex: number;
  private fixture: FixtureFile = {};

  constructor(private readonly fixturePath: string, private scenario = "success") {
    if (fs.existsSync(fixturePath)) {
      const raw = fs.readFileSync(fixturePath, "utf-8");
      this.fixture = JSON.parse(raw);
      this.tasks = this.loadTasksFromFixture();
    }
    
    const times = this.tasks.flatMap((task) => [task.created_at, task.updated_at]);
    const maxTime = times.length ? Math.max(...times) : 1700000002000;
    this.clock = Math.max(1700000002000, maxTime + 1);
    this.idIndex = 1;
  }

  private loadTasksFromFixture(): Task[] {
    const s = this.getScenario();
    // Support legacy fixture format (top-level tasks array) or scenario format
    const tasks = Array.isArray(this.fixture.tasks) ? this.fixture.tasks : (s.outputs?.tasks || []);
    return tasks.map((task: any) => ({
      ...task,
      blockedBy: Array.isArray(task.blockedBy) ? task.blockedBy : [],
    }));
  }

  private getScenario(): ScenarioFixture {
    const scenarios = this.fixture.scenarios ?? {};
    const scenario = scenarios[this.scenario] || scenarios["success"] || {};
    if (scenario.error) {
      const code = AppErrorCodeSchema.parse(scenario.error.code);
      throw new AppError(code, scenario.error.message, scenario.error.details);
    }
    return scenario;
  }

  async create(title: string, description: string, assignee?: string): Promise<Task> {
    this.getScenario(); // Check for fault
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
    this.getScenario(); // Check for fault
    const task = this.tasks.find(t => t.id === id);
    if (!task) {
      throw new AppError("VALIDATION_FAILED", `Task ${id} not found`);
    }
    task.status = status;
    task.updated_at = this.nextTime();
    return task;
  }

  async list(status?: TaskStatus): Promise<Task[]> {
    this.getScenario(); // Check for fault
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