import { z } from "zod";
import { AppError } from "./store.contract.js";

export const LockSchema = z.object({
  id: z.string().uuid(),
  resource: z.string(), // Normalized file path
  ownerId: z.string(),
  createdAt: z.number(),
  expiresAt: z.number(),
  reason: z.string().optional(),
});
export type Lock = z.infer<typeof LockSchema>;

export interface ILocker {
  /**
   * Attempts to acquire locks for ALL requested resources.
   * If ANY resource is already locked by another owner, fails.
   * Re-entrancy: If owner already holds the lock, it is refreshed/kept.
   * 
   * @returns Array of acquired Locks.
   * @throws AppError('LOCKED') if any resource is unavailable.
   */
  acquire(
    resources: string[], 
    ownerId: string, 
    ttlMs: number,
    reason?: string
  ): Promise<Lock[]>;

  /**
   * Releases locks for specific resources if held by owner.
   */
  release(resources: string[], ownerId: string): Promise<void>;

  /**
   * Renews locks for specific resources if held by owner.
   */
  renew(resources: string[], ownerId: string, ttlMs: number): Promise<Lock[]>;

  /**
   * Returns all active locks (filtering out expired ones).
   */
  list(): Promise<Lock[]>;

  /**
   * Forcefully releases locks (Admin/Panic tool).
   */
  forceRelease(resources: string[]): Promise<void>;
}
