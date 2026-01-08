/**
 * Purpose: Define the contract for the Seam Scaffolder tool.
 */
import { z } from "zod";

export const ScaffoldInputSchema = z.object({
  seamName: z.string().min(1).regex(/^[a-z0-9_]+$/, "Seam name must be snake_case (e.g., 'plan_parser')"),
  baseDir: z.string().default("."),
});
export type ScaffoldInput = z.infer<typeof ScaffoldInputSchema>;

export const GeneratedFileSchema = z.object({
  path: z.string(),
  type: z.enum(["contract", "probe", "fixture", "mock", "test", "adapter"]),
});
export type GeneratedFile = z.infer<typeof GeneratedFileSchema>;

export const ScaffoldResultSchema = z.object({
  files: z.array(GeneratedFileSchema),
  success: z.boolean(),
  message: z.string().optional(),
});
export type ScaffoldResult = z.infer<typeof ScaffoldResultSchema>;

export interface IScaffolder {
  scaffold(input: ScaffoldInput): Promise<ScaffoldResult>;
}
