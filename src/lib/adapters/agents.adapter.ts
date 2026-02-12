import { randomUUID } from "crypto";
import type { Agent, IAgentRegistry } from "../../../contracts/agents.contract.js";
import { AgentNameSchema, AgentSelfNameSchema } from "../../../contracts/agents.contract.js";
import type { IStore, PersistedStore } from "../../../contracts/store.contract.js";
import { AppError } from "../../../contracts/store.contract.js";

export class AgentAdapter implements IAgentRegistry {
  constructor(private readonly store: IStore) {}

  private async runTransaction<T>(
    operation: (current: PersistedStore) => { nextState: PersistedStore; result: T }
  ): Promise<T> {
    const MAX_RETRIES = 5;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        const current = await this.store.load();
        const { nextState, result } = operation(current);
        await this.store.update(() => nextState, current.revision);
        return result;
      } catch (err: any) {
        if (err.code === "STALE_REVISION") {
          attempt += 1;
          continue;
        }
        throw err;
      }
    }

    throw new AppError("INTERNAL_ERROR", "Failed to update agents after max retries");
  }

  async register(name: string, selfName: string): Promise<Agent> {
    const validatedName = AgentNameSchema.parse(name);
    const validatedSelfName = AgentSelfNameSchema.parse(selfName);
    const normalizedSelfName = validatedSelfName.toLowerCase();
    return this.runTransaction((current) => {
      const agents = (current.agents as Agent[]) || [];
      const existing = agents.find((a) => this.getNormalizedSelfName(a) === normalizedSelfName);

      if (existing) {
        if (existing.name !== validatedName) {
          throw new AppError(
            "VALIDATION_FAILED",
            `Agent selfName '${validatedSelfName}' already registered for ${existing.name}`
          );
        }
        const now = Date.now();
        const updated: Agent = { ...existing, selfName: existing.selfName || validatedSelfName, lastSeenAt: now };
        const nextAgents = agents.map((a) => (a.id === existing.id ? updated : a));
        return {
          nextState: { ...current, agents: nextAgents },
          result: updated,
        };
      }

      const now = Date.now();
      const agent: Agent = {
        id: randomUUID(),
        name: validatedName,
        selfName: validatedSelfName,
        createdAt: now,
        lastSeenAt: now,
      };

      return {
        nextState: { ...current, agents: [...agents, agent] },
        result: agent,
      };
    });
  }

  async resolve(id: string): Promise<Agent> {
    const current = await this.store.load();
    const agents = (current.agents as Agent[]) || [];
    const agent = agents.find((entry) => entry.id === id);
    if (!agent) {
      throw new AppError("VALIDATION_FAILED", `Agent ${id} not found`);
    }
    return agent;
  }

  async list(): Promise<Agent[]> {
    const current = await this.store.load();
    return (current.agents as Agent[]) || [];
  }

  async touch(id: string): Promise<Agent> {
    return this.runTransaction((current) => {
      const agents = (current.agents as Agent[]) || [];
      const index = agents.findIndex((entry) => entry.id === id);
      if (index === -1) {
        throw new AppError("VALIDATION_FAILED", `Agent ${id} not found`);
      }

      const updated: Agent = {
        ...agents[index],
        lastSeenAt: Date.now(),
      };

      const nextAgents = [...agents];
      nextAgents[index] = updated;

      return {
        nextState: { ...current, agents: nextAgents },
        result: updated,
      };
    });
  }

  private getNormalizedSelfName(agent: Agent): string {
    const candidate = agent.selfName || agent.name;
    return candidate.toLowerCase();
  }
}
