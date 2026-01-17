/**
 * Purpose: Define contract for sdd_tracking (seam: sdd_tracking).
 */
import { z } from "zod";
import { AppErrorCodeSchema } from "./store.contract.js";

export const SddSeamStatusSchema = z.object({
  name: z.string(),
  isCompliant: z.boolean(),
  components: z.object({
    contract: z.boolean(),
    probe: z.boolean(),
    fixture: z.boolean(),
    mock: z.boolean(),
    adapter: z.boolean(),
    test: z.boolean()
  }),
  fixtureFreshness: z.object({
    isFresh: z.boolean(),
    ageDays: z.number().nullable(),
    capturedAt: z.string().nullable()
  }),
  issues: z.array(z.string())
});
export type SddSeamStatus = z.infer<typeof SddSeamStatusSchema>;

export const SddReportSchema = z.object({
  generatedAt: z.string(),
  overallScore: z.number(), // 0.0 to 1.0
  isHealthy: z.boolean(),
  seams: z.array(SddSeamStatusSchema)
});
export type SddReport = z.infer<typeof SddReportSchema>;

export const SddTrackingErrorSchema = z.object({
  code: AppErrorCodeSchema,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional()
});
export type SddTrackingError = z.infer<typeof SddTrackingErrorSchema>;

export interface ISddTracking {
  getReport(): Promise<SddReport>;
}
