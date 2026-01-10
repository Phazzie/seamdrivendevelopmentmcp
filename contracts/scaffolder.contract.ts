/**
 * Purpose: Define the contract for the Seam Scaffolder tool.
 */
import { z } from "zod";
import { AppErrorCodeSchema } from "./store.contract.js";

export const ScaffoldFieldSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
});

export const ScaffoldModelSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(ScaffoldFieldSchema).default([]),
});

export const ScaffoldMethodSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  inputType: z.string().optional(),
  outputType: z.string().optional(),
});

export const ScaffoldScenarioSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9_]+$/),
  type: z.enum(["success", "error"]).default("success"),
  description: z.string().optional(),
});

export const ScaffoldErrorSchema = z.object({
  code: AppErrorCodeSchema,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const ScaffoldSpecSchema = z.object({
  seamName: z.string().min(1).regex(/^[a-z0-9_]+$/),
  description: z.string().optional(),
  models: z.array(ScaffoldModelSchema).default([]),
  methods: z.array(ScaffoldMethodSchema).default([]),
  scenarios: z.array(ScaffoldScenarioSchema).default([]),
  errors: z.array(ScaffoldErrorSchema).default([]),
});
export type ScaffoldSpec = z.infer<typeof ScaffoldSpecSchema>;

export const ScaffoldInputSchema = z.object({
  seamName: z.string().min(1).regex(/^[a-z0-9_]+$/, "Seam name must be snake_case (e.g., 'plan_parser')"),
  baseDir: z.string().default("."),
  spec: ScaffoldSpecSchema.optional(),
}).superRefine((value, ctx) => {
  if (value.spec && value.spec.seamName !== value.seamName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `spec.seamName (${value.spec.seamName}) must match seamName (${value.seamName})`,
      path: ["spec", "seamName"],
    });
  }
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
