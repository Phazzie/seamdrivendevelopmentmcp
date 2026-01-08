import { randomUUID } from "crypto";
import type { IStore } from "../../../contracts/store.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";
import { IReviewGate, ReviewGate, ReviewGateStatus } from "../../../contracts/review_gate.contract.js";

export class ReviewGateAdapter implements IReviewGate {
  constructor(private readonly store: IStore) {}

  async submitPlan(planId: string, plan: string): Promise<ReviewGate> {
    if (!planId || !plan) {
      throw new AppError("VALIDATION_FAILED", "planId and plan are required.");
    }

    return runTransaction(this.store, (current) => {
      const gates = Array.isArray(current.review_gates)
        ? (current.review_gates as ReviewGate[])
        : [];
      if (gates.find((gate) => gate.planId === planId)) {
        throw new AppError("VALIDATION_FAILED", `Plan ${planId} already submitted.`);
      }

      const now = Date.now();
      const gate: ReviewGate = {
        id: randomUUID(),
        planId,
        status: "pending",
        plan,
        created_at: now,
        updated_at: now,
      };

      return {
        nextState: { ...current, review_gates: [...gates, gate] },
        result: gate,
      };
    });
  }

  async submitCritique(planId: string, critique: string): Promise<ReviewGate> {
    if (!planId || !critique) {
      throw new AppError("VALIDATION_FAILED", "planId and critique are required.");
    }

    return runTransaction(this.store, (current) => {
      const gates = Array.isArray(current.review_gates)
        ? (current.review_gates as ReviewGate[])
        : [];
      const index = gates.findIndex((gate) => gate.planId === planId);
      if (index === -1) {
        throw new AppError("VALIDATION_FAILED", `Plan ${planId} not found.`);
      }
      const gate = gates[index];
      if (gate.status !== "pending") {
        throw new AppError("VALIDATION_FAILED", "Critique already submitted or plan approved.");
      }

      const updated: ReviewGate = {
        ...gate,
        status: "critique_submitted",
        critique,
        updated_at: Date.now(),
      };

      const nextGates = [...gates];
      nextGates[index] = updated;

      return {
        nextState: { ...current, review_gates: nextGates },
        result: updated,
      };
    });
  }

  async approvePlan(planId: string): Promise<ReviewGate> {
    if (!planId) {
      throw new AppError("VALIDATION_FAILED", "planId is required.");
    }

    return runTransaction(this.store, (current) => {
      const gates = Array.isArray(current.review_gates)
        ? (current.review_gates as ReviewGate[])
        : [];
      const index = gates.findIndex((gate) => gate.planId === planId);
      if (index === -1) {
        throw new AppError("VALIDATION_FAILED", `Plan ${planId} not found.`);
      }
      const gate = gates[index];
      if (gate.status !== "critique_submitted") {
        throw new AppError("VALIDATION_FAILED", "Plan must have a critique before approval.");
      }

      const updated: ReviewGate = {
        ...gate,
        status: "approved",
        updated_at: Date.now(),
      };

      const nextGates = [...gates];
      nextGates[index] = updated;

      return {
        nextState: { ...current, review_gates: nextGates },
        result: updated,
      };
    });
  }

  async getGate(planId: string): Promise<ReviewGate | null> {
    const current = await this.store.load();
    const gates = Array.isArray(current.review_gates)
      ? (current.review_gates as ReviewGate[])
      : [];
    return gates.find((gate) => gate.planId === planId) ?? null;
  }

  async list(status?: ReviewGateStatus): Promise<ReviewGate[]> {
    const current = await this.store.load();
    const gates = Array.isArray(current.review_gates)
      ? (current.review_gates as ReviewGate[])
      : [];
    if (status) {
      return gates.filter((gate) => gate.status === status);
    }
    return gates;
  }
}
