/**
 * Purpose: Define contract for divvy_work (seam: scheduler).
 */
import { z } from "zod";
import { TaskSchema } from "./tasks.contract.js";

export const SchedulerRoleSchema = z.enum(["leader", "follower"]);
export type SchedulerRole = z.infer<typeof SchedulerRoleSchema>;

export const SchedulerAgentSchema = z.object({
  agentId: z.string(),
  role: SchedulerRoleSchema,
  capacity: z.number().int().nonnegative().default(1),
  currentLoad: z.number().int().nonnegative().default(0),
});
export type SchedulerAgent = z.infer<typeof SchedulerAgentSchema>;

export const SchedulerInputSchema = z.object({
  tasks: z.array(TaskSchema),
  agents: z.array(SchedulerAgentSchema).min(1),
});
export type SchedulerInput = z.infer<typeof SchedulerInputSchema>;

export const SchedulerAssignmentSchema = z.object({
  taskId: z.string().uuid(),
  agentId: z.string(),
});
export type SchedulerAssignment = z.infer<typeof SchedulerAssignmentSchema>;

export const SchedulerResultSchema = z.object({
  assignments: z.array(SchedulerAssignmentSchema),
  unassigned: z.array(z.string().uuid()).default([]),
});
export type SchedulerResult = z.infer<typeof SchedulerResultSchema>;

export const SchedulerScenarioSchema = z.object({
  input: SchedulerInputSchema,
  expected: SchedulerResultSchema,
});
export type SchedulerScenario = z.infer<typeof SchedulerScenarioSchema>;

export const SchedulerFixtureSchema = z.object({
  captured_at: z.string(),
  scenarios: z.record(z.string(), SchedulerScenarioSchema),
});
export type SchedulerFixture = z.infer<typeof SchedulerFixtureSchema>;

export interface IScheduler {
  schedule(input: SchedulerInput): Promise<SchedulerResult>;
}
