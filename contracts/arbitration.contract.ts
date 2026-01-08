/**
 * Purpose: Define contract for human_arbitration (seam: arbitration).
 */
import { z } from "zod";

export const GavelStatusSchema = z.enum(["idle", "requested", "granted"]);
export type GavelStatus = z.infer<typeof GavelStatusSchema>;

export const GavelStateSchema = z.object({
  status: GavelStatusSchema,
  requestedBy: z.string().optional(),
  grantedTo: z.string().optional(),
  updated_at: z.number(),
});
export type GavelState = z.infer<typeof GavelStateSchema>;

export const GavelFixtureSchema = z.object({
  captured_at: z.string(),
  state: GavelStateSchema,
});
export type GavelFixture = z.infer<typeof GavelFixtureSchema>;

export interface IArbitration {
  getState(): Promise<GavelState>;
  request(agentId: string): Promise<GavelState>;
  grant(targetAgentId: string): Promise<GavelState>;
  release(): Promise<GavelState>;
}
