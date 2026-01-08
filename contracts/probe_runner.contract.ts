/**
 * Purpose: Define contract for the Probe Runner tool.
 */
import { z } from "zod";

export const ProbeResultSchema = z.object({
  name: z.string(),
  success: z.boolean(),
  code: z.number().nullable(),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number(),
});
export type ProbeResult = z.infer<typeof ProbeResultSchema>;

export const RunProbesInputSchema = z.object({
  pattern: z.string().default("probes/**/*.probe.ts"),
});
export type RunProbesInput = z.infer<typeof RunProbesInputSchema>;

export interface IProbeRunner {
  run(input: RunProbesInput): Promise<ProbeResult[]>;
}
