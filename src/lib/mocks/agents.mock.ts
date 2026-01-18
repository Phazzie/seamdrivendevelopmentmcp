import fs from "fs";
import { randomUUID } from "crypto";
import type { IAgentRegistry, Agent } from "../../../contracts/agents.contract.js";
import { AgentNameSchema } from "../../../contracts/agents.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";

type ScenarioFixture = {
  outputs?: any;
  error?: { code: string; message: string; details?: Record<string, unknown> };
};

type FixtureFile = {
  captured_at: string;
  scenarios: Record<string, ScenarioFixture>;
};

export class MockAgentRegistry implements IAgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private fixture: FixtureFile | null = null;

  constructor(private readonly fixturePath?: string, private readonly scenario = "success") {
    if (fixturePath && fs.existsSync(fixturePath)) {
      const raw = fs.readFileSync(fixturePath, "utf-8");
      this.fixture = JSON.parse(raw);
    }
  }

  private getScenario(): ScenarioFixture {
    if (!this.fixture) return {};
    const scenarios = this.fixture.scenarios ?? {};
    const scenario = scenarios[this.scenario] || scenarios["success"] || {};
    if (scenario.error) {
      const code = AppErrorCodeSchema.parse(scenario.error.code);
      throw new AppError(code, scenario.error.message, scenario.error.details);
    }
    return scenario;
  }

  async register(name: string): Promise<Agent> {
    this.getScenario();
    const parsedName = AgentNameSchema.parse(name);
    const agent: Agent = {
      id: randomUUID(),
      name: parsedName,
      lastSeenAt: Date.now(),
      createdAt: Date.now()
    };
    this.agents.set(agent.id, agent);
    return agent;
  }

  async resolve(id: string): Promise<Agent> {
    this.getScenario();
    const agent = this.agents.get(id);
    if (!agent) throw new AppError("VALIDATION_FAILED", `Agent ${id} not found`);
    return agent;
  }

  async list(): Promise<Agent[]> {
    this.getScenario();
    return Array.from(this.agents.values());
  }

  async touch(id: string): Promise<Agent> {
    this.getScenario();
    const agent = this.agents.get(id);
    if (!agent) throw new AppError("VALIDATION_FAILED", `Agent ${id} not found`);
    agent.lastSeenAt = Date.now();
    return agent;
  }
}
