import { z } from "zod";
import { KnowledgeGraphSchema } from "./knowledge.contract.js";
import { AdrSchema } from "./adr.contract.js";
import { EventSchema } from "./event_stream.contract.js";
import { NotificationSchema } from "./notifications.contract.js";
import { MoodEntrySchema } from "./mood.contract.js";
import { GavelStateSchema } from "./arbitration.contract.js";
import { ReviewGateSchema } from "./review_gate.contract.js";
import { IdeaSchema } from "./ideas.contract.js";

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
  public details?: Record<string, unknown>;

  constructor(
    code: AppErrorCode,
    message: string,
    details?: Record<string, unknown>
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
  tasks: z.array(z.unknown()).default([]),
  ideas: z.array(IdeaSchema).default([]),
  messages: z.array(z.unknown()).default([]),
  locks: z.array(z.unknown()).default([]),
  agents: z.array(z.unknown()).default([]),
  audit: z.array(z.unknown()).default([]),
  panic_mode: z.boolean().default(false),
  knowledge: KnowledgeStoreSchema.default({ nodes: [], edges: [] }),
  adrs: z.array(AdrSchema).default([]),
  events: z.array(EventSchema).default([]),
  notifications: z.array(NotificationSchema).default([]),
  moods: z.array(MoodEntrySchema).default([]),
  arbitration: GavelStateSchema.default({ status: "idle", updated_at: 0 }),
  review_gates: z.array(ReviewGateSchema).default([]),
});

export type PersistedStore = z.infer<typeof PersistedStoreSchema>;

// --- Interface ---

export interface IStore {
  /**
   * Loads the current state from disk.
   */
  load(): Promise<PersistedStore>;

  /**
   * Performs an atomic OCC update.
   */
  update(
    updater: (current: PersistedStore) => PersistedStore, 
    expectedRevision: number
  ): Promise<PersistedStore>;

  /**
   * Pulse: Wait for a new revision.
   */
  waitForRevision(sinceRevision: number, timeoutMs: number): Promise<number>;
}