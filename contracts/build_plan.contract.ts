/**
 * Purpose: Define contract for build_plan (seam: build_plan).
 */
import { z } from "zod";

export const BuildPlanItemSchema = z.object({
  text: z.string().min(1),
  subitems: z.array(z.string().min(1)).default([]),
});
export type BuildPlanItem = z.infer<typeof BuildPlanItemSchema>;

export const BuildPlanSectionSchema = z.object({
  title: z.string().min(1),
  items: z.array(BuildPlanItemSchema).default([]),
});
export type BuildPlanSection = z.infer<typeof BuildPlanSectionSchema>;

export const BuildPlanInputSchema = z
  .object({
    title: z.string().min(1).optional(),
    sections: z.array(BuildPlanSectionSchema).default([]),
    orphanItems: z.array(BuildPlanItemSchema).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.sections.length === 0 && value.orphanItems.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Plan must include at least one section or orphan item.",
      });
    }
  });
export type BuildPlanInput = z.infer<typeof BuildPlanInputSchema>;

export interface IBuildPlan {
  build(input: BuildPlanInput): Promise<BuildPlanResult>;
}

export const BuildPlanResultSchema = z.object({
  markdown: z.string().min(1),
});
export type BuildPlanResult = z.infer<typeof BuildPlanResultSchema>;

export const BuildPlanScenarioSchema = z.object({
  input: BuildPlanInputSchema,
  expected: BuildPlanResultSchema,
});
export type BuildPlanScenario = z.infer<typeof BuildPlanScenarioSchema>;

export const BuildPlanFixtureSchema = z.object({
  captured_at: z.string(),
  scenarios: z.record(z.string(), BuildPlanScenarioSchema),
});
export type BuildPlanFixture = z.infer<typeof BuildPlanFixtureSchema>;
