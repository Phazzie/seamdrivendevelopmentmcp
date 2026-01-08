import { z } from "zod";
import { KnowledgeGraphSchema } from "./knowledge.contract.js";
import { AdrSchema } from "./adr.contract.js";
import { EventSchema } from "./event_stream.contract.js";

const KnowledgeStoreSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return { nodes: [], edges: [] };
  }
  return value;
}, KnowledgeGraphSchema);

// --- Standard Error Envelope (From AGENTS.md) ---
export const AppErrorCodeSchema = z.enum([
  "LOCKED", 
  "STALE_REVISION", 
  "PANIC_MODE", 
  "VALIDATION_FAILED", 
  "INTERNAL_ERROR"
]);
export type AppErrorCode = z.infer<typeof AppErrorCodeSchema>;

export class AppError extends Error {
  public code: AppErrorCode;
  public details?: Record<string, any>;

  constructor(
    code: AppErrorCode,
    message: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

// --- Store Data Shape ---

export const PersistedStoreSchema = z.object({
  schemaVersion: z.literal(1),
  revision: z.number().int().nonnegative(),
  // We use 'unknown' here for the specific domains (tasks, locks) 
  // because the Store shouldn't know their internal shape, just that they exist.
  // The domain adapters will validate them.
  tasks: z.array(z.unknown()).default([]),
  messages: z.array(z.unknown()).default([]),
  locks: z.array(z.unknown()).default([]),
  agents: z.array(z.unknown()).default([]),
  audit: z.array(z.unknown()).default([]),
  panic_mode: z.boolean().default(false),
  knowledge: KnowledgeStoreSchema.default({ nodes: [], edges: [] }),
  adrs: z.array(AdrSchema).default([]),
  events: z.array(EventSchema).default([]),
});

export type PersistedStore = z.infer<typeof PersistedStoreSchema>;

// --- Interface ---

export interface IStore {
  /**
   * Loads the current state from disk.
   * If file is missing, returns a default initialized store.
   */
  load(): Promise<PersistedStore>;

  /**
   * Performs an atomic update.
   * 1. Loads current state.
   * 2. Checks if current.revision == expectedRevision.
   * 3. Runs the updater function.
   * 4. Increments revision.
   * 5. Saves to disk.
   * 
   * @throws AppError('STALE_REVISION') if race condition detected.
   */
  update(
    updater: (current: PersistedStore) => PersistedStore, 
    expectedRevision: number
  ): Promise<PersistedStore>;

  /**
   * Subscribe to store changes.
   */
  on(event: 'change', listener: (revision: number) => void): void;
  off(event: 'change', listener: (revision: number) => void): void;
}
