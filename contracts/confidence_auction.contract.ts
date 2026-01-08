/**
 * Purpose: Define contract for confidence_auction (seam: confidence_auction).
 */
import { z } from "zod";

export const ConfidenceBidSchema = z.object({
  agentId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string().optional(),
});
export type ConfidenceBid = z.infer<typeof ConfidenceBidSchema>;

export const ConfidenceAuctionInputSchema = z.object({
  bids: z.array(ConfidenceBidSchema).min(1),
});
export type ConfidenceAuctionInput = z.input<typeof ConfidenceAuctionInputSchema>;

export const ConfidenceAuctionResultSchema = z.object({
  winner: ConfidenceBidSchema,
  ranking: z.array(ConfidenceBidSchema),
});
export type ConfidenceAuctionResult = z.infer<typeof ConfidenceAuctionResultSchema>;

export const ConfidenceAuctionScenarioSchema = z.object({
  input: ConfidenceAuctionInputSchema,
  expected: ConfidenceAuctionResultSchema,
});
export type ConfidenceAuctionScenario = z.infer<typeof ConfidenceAuctionScenarioSchema>;

export const ConfidenceAuctionFixtureSchema = z.object({
  captured_at: z.string(),
  scenarios: z.record(z.string(), ConfidenceAuctionScenarioSchema),
});
export type ConfidenceAuctionFixture = z.infer<typeof ConfidenceAuctionFixtureSchema>;

export interface IConfidenceAuction {
  resolve(input: ConfidenceAuctionInput): Promise<ConfidenceAuctionResult>;
}
