import fs from "fs";
import path from "path";
import type { Agent, IAgentRegistry } from "../../../contracts/agents.contract.js";
import { AgentNameSchema } from "../../../contracts/agents.contract.js";
import { AppError } from "../../../contracts/store.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "agents", "local_user.json");
const DETERMINISTIC_IDS = [
  "00000000-0000-0000-0000-000000000001",
  "00000000-0000-0000-0000-000000000002",
];
const BASE_TIME = 1700000000000;

type AgentScenario = "new_agent" | "existing_agent";

function loadFixtureAgent(): Agent | null {
  if (!fs.existsSync(FIXTURE_PATH)) return null;
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as Agent & { captured_at?: string };
  const { captured_at, ...rest } = parsed;
  return rest as Agent;
}

export class MockAgentRegistry implements IAgentRegistry {
  private agents: Agent[];
  private clock: number;
  private idIndex: number;

  constructor(scenario: AgentScenario = "new_agent") {
    const fixture = loadFixtureAgent();
    this.agents = [];
    this.clock = BASE_TIME;
    this.idIndex = 0;

    if (fixture && scenario === "existing_agent") {
      this.agents.push(fixture);
      this.clock = Math.max(this.clock, fixture.lastSeenAt + 1);
    }
  }

  async register(name: string): Promise<Agent> {
    const validatedName = AgentNameSchema.parse(name);
    const existing = this.agents.find((agent) => agent.name === validatedName);
    if (existing) return existing;

    const now = this.nextTime();
    const agent: Agent = {
      id: this.nextId(),
      name: validatedName,
      createdAt: now,
      lastSeenAt: now,
    };

    this.agents.push(agent);
    return agent;
  }

  async resolve(id: string): Promise<Agent> {
    const agent = this.agents.find((entry) => entry.id === id);
    if (!agent) {
      throw new AppError("VALIDATION_FAILED", `Agent ${id} not found`);
    }
    return agent;
  }

  async list(): Promise<Agent[]> {
    return [...this.agents];
  }

  async touch(id: string): Promise<Agent> {
    const agent = await this.resolve(id);
    agent.lastSeenAt = this.nextTime();
    return agent;
  }

  private nextTime(): number {
    const value = this.clock;
    this.clock += 1;
    return value;
  }

  private nextId(): string {
    const value = DETERMINISTIC_IDS[Math.min(this.idIndex, DETERMINISTIC_IDS.length - 1)];
    this.idIndex += 1;
    return value;
  }
}
