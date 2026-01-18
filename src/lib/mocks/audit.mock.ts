import fs from "fs";
import { randomUUID } from "crypto";
import type { IAuditLog, AuditEvent, AuditListFilter } from "../../../contracts/audit.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";

type ScenarioFixture = {
  outputs?: any;
  error?: { code: string; message: string; details?: Record<string, unknown> };
};

type FixtureFile = {
  captured_at: string;
  scenarios: Record<string, ScenarioFixture>;
};

export class MockAuditLog implements IAuditLog {
  private events: AuditEvent[] = [];
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

  async record(agentId: string, tool: string, argsSummary: string, resultSummary: string, errorCode?: string): Promise<AuditEvent> {
    this.getScenario();
    const event: AuditEvent = {
      id: randomUUID(),
      timestamp: Date.now(),
      agentId,
      tool,
      argsSummary,
      resultSummary,
      errorCode,
    };
    this.events.push(event);
    return event;
  }

  async list(filter?: AuditListFilter): Promise<AuditEvent[]> {
    this.getScenario();
    let filtered = [...this.events];
    if (filter?.agentId) filtered = filtered.filter(e => e.agentId === filter.agentId);
    if (filter?.tool) filtered = filtered.filter(e => e.tool === filter.tool);
    return filtered;
  }
}