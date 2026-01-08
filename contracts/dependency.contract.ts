import { z } from "zod";
import type { Task, TaskStatus } from "./tasks.contract.js";
import { AppError } from "./store.contract.js";

export const DependencySchema = z.object({
  taskId: z.string().uuid(),
  blockedBy: z.array(z.string().uuid()),
});
export type DependencyInfo = z.infer<typeof DependencySchema>;

export interface IDependencyManager {
  /**
   * Adds a prerequisite relationship (child depends on parent).
   * @throws AppError('VALIDATION_FAILED') if either task is missing.
   */
  addDependency(childId: string, parentId: string): Promise<Task>;

  /**
   * Removes a prerequisite relationship.
   * @throws AppError('VALIDATION_FAILED') if the child task is missing.
   */
  removeDependency(childId: string, parentId: string): Promise<Task>;

  /**
   * Returns the dependency list for a task.
   * @throws AppError('VALIDATION_FAILED') if the task is missing.
   */
  getDependencies(taskId: string): Promise<DependencyInfo>;

  /**
   * Lists tasks whose dependencies are complete.
   */
  listActionable(status?: TaskStatus): Promise<Task[]>;
}
