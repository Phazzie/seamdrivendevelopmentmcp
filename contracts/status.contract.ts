import { z } from "zod";

export const StatusSnapshotSchema = z.object({
  revision: z.number(),
  panicMode: z.boolean(),
  lockCount: z.number(),
  taskCount: z.number(),
  messageCount: z.number(),
  agentCount: z.number(),
  uptimeMs: z.number(),
});

export type StatusSnapshot = z.infer<typeof StatusSnapshotSchema>;

export interface IStatusReader {
  getStatus(): Promise<StatusSnapshot>;
}
