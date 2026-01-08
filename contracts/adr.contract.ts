/**
 * Purpose: Define contract for ADR log (seam: adr).
 */
import { z } from "zod";

export const AdrStatusSchema = z.enum(["proposed", "accepted"]);
export type AdrStatus = z.infer<typeof AdrStatusSchema>;

export const AdrInputSchema = z.object({
  title: z.string().min(1),
  status: AdrStatusSchema.optional().default("proposed"),
  context: z.string().min(1),
  decision: z.string().min(1),
});
export type AdrInput = z.input<typeof AdrInputSchema>;

export const AdrSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  status: AdrStatusSchema,
  context: z.string().min(1),
  decision: z.string().min(1),
  created_at: z.number(),
});
export type Adr = z.infer<typeof AdrSchema>;

export const AdrFixtureSchema = z.object({
  captured_at: z.string(),
  adrs: z.array(AdrSchema),
});
export type AdrFixture = z.infer<typeof AdrFixtureSchema>;

export interface IAdrLog {
  create(input: AdrInput): Promise<Adr>;
  list(status?: AdrStatus): Promise<Adr[]>;
}
