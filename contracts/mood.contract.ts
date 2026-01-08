/**
 * Purpose: Define contract for mood_log (seam: mood).
 */
import { z } from "zod";

export const MoodInputSchema = z.object({
  agentId: z.string().min(1),
  mood: z.string().min(1),
  note: z.string().optional(),
});
export type MoodInput = z.input<typeof MoodInputSchema>;

export const MoodEntrySchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().min(1),
  mood: z.string().min(1),
  note: z.string().optional(),
  timestamp: z.number(),
});
export type MoodEntry = z.infer<typeof MoodEntrySchema>;

export const MoodListOptionsSchema = z.object({
  agentId: z.string().optional(),
  limit: z.number().int().positive().optional(),
});
export type MoodListOptions = z.input<typeof MoodListOptionsSchema>;

export const MoodFixtureSchema = z.object({
  captured_at: z.string(),
  entries: z.array(MoodEntrySchema),
});
export type MoodFixture = z.infer<typeof MoodFixtureSchema>;

export interface IMoodLog {
  log(input: MoodInput): Promise<MoodEntry>;
  list(options?: MoodListOptions): Promise<MoodEntry[]>;
}
