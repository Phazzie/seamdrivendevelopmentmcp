// Purpose: Contract for the Scientist seam (autonomous probing) (seam: scientist)
import { z } from "zod";

export const ExperimentStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed"
]);
export type ExperimentStatus = z.infer<typeof ExperimentStatusSchema>;

export const ExperimentResultSchema = z.object({
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  error: z.string().optional(),
});
export type ExperimentResult = z.infer<typeof ExperimentResultSchema>;

export const ExperimentSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  hypothesis: z.string(),
  probeCode: z.string(),
  status: ExperimentStatusSchema,
  result: ExperimentResultSchema.nullable(),
  createdAt: z.string(), // ISO-8601
  completedAt: z.string().nullable(), // ISO-8601
});
export type Experiment = z.infer<typeof ExperimentSchema>;

export interface IScientist {
  createExperiment(ideaId: string, hypothesis: string, probeCode: string): Promise<Experiment>;
  runExperiment(id: string): Promise<ExperimentResult>;
  listExperiments(status?: ExperimentStatus): Promise<Experiment[]>;
}
