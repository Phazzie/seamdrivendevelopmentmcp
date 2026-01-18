/**
 * Purpose: Define contract for devils_advocate review gate (seam: review_gate).
 */
import { z } from "zod";

export const ReviewGateStatusSchema = z.enum(["pending", "critique_submitted", "approved"]);
export type ReviewGateStatus = z.infer<typeof ReviewGateStatusSchema>;

export const ReviewGateSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().min(1),
  status: ReviewGateStatusSchema,
  plan: z.string().min(1),
  affectedResources: z.array(z.string()).default([]), // Added
  critique: z.string().optional(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type ReviewGate = z.infer<typeof ReviewGateSchema>;

export const ReviewGateFixtureSchema = z.object({
  captured_at: z.string(),
  gates: z.array(ReviewGateSchema),
});
export type ReviewGateFixture = z.infer<typeof ReviewGateFixtureSchema>;

export interface IReviewGate {
  submitPlan(planId: string, plan: string): Promise<ReviewGate>;
  submitCritique(planId: string, critique: string): Promise<ReviewGate>;
  approvePlan(planId: string): Promise<ReviewGate>;
  getGate(planId: string): Promise<ReviewGate | null>;
  list(status?: ReviewGateStatus): Promise<ReviewGate[]>;
}
