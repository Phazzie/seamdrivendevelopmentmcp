/**
 * Purpose: Define contract for plan_parser (seam: plan_parser).
 */
import { z } from "zod";
import { TaskSchema } from "./tasks.contract.js";

export const PlanParserInputSchema = z.object({
  markdown: z.string().min(1),
  source: z.string().optional(),
});
export type PlanParserInput = z.infer<typeof PlanParserInputSchema>;

export const PlanParserResultSchema = z.object({
  tasks: z.array(TaskSchema),
});
export type PlanParserResult = z.infer<typeof PlanParserResultSchema>;

export const PlanParserScenarioSchema = z.object({
  input: PlanParserInputSchema,
  expected: PlanParserResultSchema,
});
export type PlanParserScenario = z.infer<typeof PlanParserScenarioSchema>;

export const PlanParserFixtureSchema = z.object({
  captured_at: z.string(),
  scenarios: z.record(z.string(), PlanParserScenarioSchema),
});
export type PlanParserFixture = z.infer<typeof PlanParserFixtureSchema>;

export interface IPlanParser {
  parse(input: PlanParserInput): Promise<PlanParserResult>;
}
