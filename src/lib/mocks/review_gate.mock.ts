import fs from "fs";
import { randomUUID } from "crypto";
import type { IReviewGate, ReviewGate, ReviewGateStatus } from "../../../contracts/review_gate.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";

type ScenarioFixture = {
  outputs?: any;
  error?: { code: string; message: string; details?: Record<string, unknown> };
};

type FixtureFile = {
  captured_at: string;
  scenarios: Record<string, ScenarioFixture>;
};

export class MockReviewGate implements IReviewGate {
  private gates: ReviewGate[] = [];
  private fixture: FixtureFile | null = null;

  constructor(private readonly fixturePath?: string, private readonly scenario = "success") {
    if (fixturePath && fs.existsSync(fixturePath)) {
      const raw = fs.readFileSync(fixturePath, "utf-8");
      this.fixture = JSON.parse(raw);
      const s = this.fixture?.scenarios[this.scenario] || this.fixture?.scenarios["success"];
      if (s?.outputs?.gates) {
        this.gates = [...s.outputs.gates];
      }
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

  async submitPlan(planId: string, plan: string, affectedResources: string[] = []): Promise<ReviewGate> {
    this.getScenario();
    const now = Date.now();
    const gate: ReviewGate = {
      id: randomUUID(),
      planId,
      status: "pending",
      plan,
      affectedResources,
      created_at: now,
      updated_at: now
    };
    this.gates.push(gate);
    return gate;
  }

  async submitCritique(planId: string, critique: string): Promise<ReviewGate> {
    this.getScenario();
    const gate = this.gates.find((g) => g.planId === planId);
    if (!gate) throw new AppError("VALIDATION_FAILED", `Plan ${planId} not found`);
    gate.status = "critique_submitted";
    gate.critique = critique;
    gate.updated_at = Date.now();
    return gate;
  }

  async approvePlan(planId: string): Promise<ReviewGate> {
    this.getScenario();
    const gate = this.gates.find((g) => g.planId === planId);
    if (!gate) throw new AppError("VALIDATION_FAILED", `Plan ${planId} not found`);
    
    if (gate.status !== "critique_submitted") {
      throw new AppError("VALIDATION_FAILED", "Plan cannot be approved without a critique.");
    }

    gate.status = "approved";
    gate.updated_at = Date.now();
    return gate;
  }

  async getGate(planId: string): Promise<ReviewGate | null> {
    this.getScenario();
    return this.gates.find((g) => g.planId === planId) || null;
  }

  async list(status?: ReviewGateStatus): Promise<ReviewGate[]> {
    this.getScenario();
    return status ? this.gates.filter((g) => g.status === status) : this.gates;
  }
}
