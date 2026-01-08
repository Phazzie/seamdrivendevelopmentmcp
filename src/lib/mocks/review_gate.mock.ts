import fs from "fs";
import path from "path";
import { AppError } from "../../../contracts/store.contract.js";
import type { IReviewGate, ReviewGate, ReviewGateStatus } from "../../../contracts/review_gate.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "review_gate", "sample.json");

type ReviewGateFixture = {
  captured_at?: string;
  gates?: ReviewGate[];
};

function loadFixtureGates(): ReviewGate[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as ReviewGateFixture;
  return Array.isArray(parsed.gates) ? parsed.gates : [];
}

export class MockReviewGate implements IReviewGate {
  private gates: ReviewGate[];

  constructor() {
    this.gates = loadFixtureGates();
  }

  async submitPlan(planId: string, plan: string): Promise<ReviewGate> {
    if (this.gates.find((gate) => gate.planId === planId)) {
      throw new AppError("VALIDATION_FAILED", `Plan ${planId} already submitted.`);
    }
    const now = Date.now();
    const gate: ReviewGate = {
      id: `00000000-0000-0000-0000-${(this.gates.length + 1).toString().padStart(12, "0")}`,
      planId,
      status: "pending",
      plan,
      created_at: now,
      updated_at: now,
    };
    this.gates.push(gate);
    return gate;
  }

  async submitCritique(planId: string, critique: string): Promise<ReviewGate> {
    const gate = this.gates.find((entry) => entry.planId === planId);
    if (!gate) {
      throw new AppError("VALIDATION_FAILED", `Plan ${planId} not found.`);
    }
    if (gate.status !== "pending") {
      throw new AppError("VALIDATION_FAILED", "Critique already submitted or plan approved.");
    }
    gate.status = "critique_submitted";
    gate.critique = critique;
    gate.updated_at = Date.now();
    return gate;
  }

  async approvePlan(planId: string): Promise<ReviewGate> {
    const gate = this.gates.find((entry) => entry.planId === planId);
    if (!gate) {
      throw new AppError("VALIDATION_FAILED", `Plan ${planId} not found.`);
    }
    if (gate.status !== "critique_submitted") {
      throw new AppError("VALIDATION_FAILED", "Plan must have a critique before approval.");
    }
    gate.status = "approved";
    gate.updated_at = Date.now();
    return gate;
  }

  async getGate(planId: string): Promise<ReviewGate | null> {
    return this.gates.find((gate) => gate.planId === planId) ?? null;
  }

  async list(status?: ReviewGateStatus): Promise<ReviewGate[]> {
    if (status) {
      return this.gates.filter((gate) => gate.status === status);
    }
    return [...this.gates];
  }
}
