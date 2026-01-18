import { randomUUID } from "crypto";
import type { IReviewGate, ReviewGate, ReviewGateStatus } from "../../../contracts/review_gate.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import type { IStore } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";

export class ReviewGateAdapter implements IReviewGate {
  constructor(private readonly store: IStore) {}

  async submitPlan(planId: string, plan: string, affectedResources: string[] = []): Promise<ReviewGate> {
    return runTransaction(this.store, (current) => {
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

      const gates = Array.isArray(current.review_gates) ? (current.review_gates as ReviewGate[]) : [];
      return {
        nextState: { ...current, review_gates: [...gates, gate] },
        result: gate,
      };
    });
  }

  async submitCritique(planId: string, critique: string): Promise<ReviewGate> {
    return runTransaction(this.store, (current) => {
      const gates = Array.isArray(current.review_gates) ? (current.review_gates as ReviewGate[]) : [];
      const index = gates.findIndex((g) => g.planId === planId);
      if (index === -1) throw new AppError("VALIDATION_FAILED", `Plan ${planId} not found`);

      const updated = {
        ...gates[index],
        status: "critique_submitted" as const,
        critique,
        updated_at: Date.now(),
      };

      const next = [...gates];
      next[index] = updated;
      return { nextState: { ...current, review_gates: next }, result: updated };
    });
  }

  async approvePlan(planId: string): Promise<ReviewGate> {
    return runTransaction(this.store, (current) => {
      const gates = Array.isArray(current.review_gates) ? (current.review_gates as ReviewGate[]) : [];
      const index = gates.findIndex((g) => g.planId === planId);
      if (index === -1) throw new AppError("VALIDATION_FAILED", `Plan ${planId} not found`);

      // Senior Mandate: Enforcement of State Machine
      if (gates[index].status !== "critique_submitted") {
        throw new AppError("VALIDATION_FAILED", "Plan cannot be approved without a critique.");
      }

      const updated = {
        ...gates[index],
        status: "approved" as const,
        updated_at: Date.now(),
      };

      const next = [...gates];
      next[index] = updated;
      return { nextState: { ...current, review_gates: next }, result: updated };
    });
  }

  async getGate(planId: string): Promise<ReviewGate | null> {
    const current = await this.store.load();
    const gates = Array.isArray(current.review_gates) ? (current.review_gates as ReviewGate[]) : [];
    return gates.find((g) => g.planId === planId) || null;
  }

  async list(status?: ReviewGateStatus): Promise<ReviewGate[]> {
    const current = await this.store.load();
    const gates = Array.isArray(current.review_gates) ? (current.review_gates as ReviewGate[]) : [];
    return status ? gates.filter((g) => g.status === status) : gates;
  }
}
