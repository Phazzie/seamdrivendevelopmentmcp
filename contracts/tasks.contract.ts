import { z } from "zod";
import { AppError } from "./store.contract.js";

export const TaskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "review_pending",
  "done"
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  status: TaskStatusSchema,
  assignee: z.string().optional(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type Task = z.infer<typeof TaskSchema>;

export interface ITaskRegistry {
  create(title: string, description: string, assignee?: string): Promise<Task>;
  updateStatus(id: string, status: TaskStatus): Promise<Task>;
  list(status?: TaskStatus): Promise<Task[]>;
}
