import fs from "fs";
import type { IDependencyManager } from "../../../contracts/dependency.contract.js";
import type { Task, TaskStatus } from "../../../contracts/tasks.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";

export class MockDependencyManager implements IDependencyManager {
  private tasks: Task[] = [];
  private fixture: any = {};

  constructor(private readonly fixturePath: string, private readonly scenario = "success") {
    if (fs.existsSync(fixturePath)) {
      this.fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      const s = this.fixture.scenarios?.[this.scenario] || this.fixture.scenarios?.["success"];
      if (s?.outputs?.tasks) {
        this.tasks = s.outputs.tasks;
      }
    }
  }

  private getScenario(): any {
    const scenarios = this.fixture.scenarios ?? {};
    const scenario = scenarios[this.scenario] || scenarios["success"] || {};
    if (scenario.error) {
      const code = AppErrorCodeSchema.parse(scenario.error.code);
      throw new AppError(code, scenario.error.message);
    }
    return scenario;
  }

  async addDependency(childId: string, parentId: string): Promise<Task> {
    this.getScenario();
    const child = this.tasks.find(t => t.id === childId);
    if (!child) throw new AppError("VALIDATION_FAILED", `Task ${childId} not found`);
    return child;
  }

  async removeDependency(childId: string, parentId: string): Promise<Task> {
    this.getScenario();
    const child = this.tasks.find(t => t.id === childId);
    if (!child) throw new AppError("VALIDATION_FAILED", `Task ${childId} not found`);
    return child;
  }

  async getDependencies(taskId: string) {
    this.getScenario();
    return { taskId, blockedBy: [] };
  }

  async listActionable(status?: TaskStatus): Promise<Task[]> {
    this.getScenario();
    return [];
  }
}