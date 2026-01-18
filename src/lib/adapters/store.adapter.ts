/**
 * Purpose: Asynchronous, Mandate-compliant Store implementation (store seam).
 * Hardened: Uses JailedFs for physical path security.
 */
import { randomUUID } from "crypto";
import EventEmitter from "events";
import { 
  PersistedStore, 
  PersistedStoreSchema, 
  AppError,
  IStore
} from "../../../contracts/store.contract.js";
import { JailedFs } from "../helpers/jailed_fs.js";

export class StoreAdapter implements IStore {
  private readonly events = new EventEmitter();

  constructor(
    private readonly filePath: string, 
    private readonly jfs: JailedFs
  ) {
    this.events.setMaxListeners(100);
  }

  async load(): Promise<PersistedStore> {
    if (!this.jfs.exists(this.filePath)) {
      return this.getDefaultState();
    }

    try {
      const content = await this.jfs.readFile(this.filePath);
      const data = JSON.parse(content);
      const result = PersistedStoreSchema.safeParse(data);
      if (!result.success) {
        throw new AppError("VALIDATION_FAILED", "Store corrupted on disk", { errors: result.error.flatten() });
      }
      return result.data;
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError("INTERNAL_ERROR", `Failed to load store: ${message}`);
    }
  }

  async update(
    updater: (current: PersistedStore) => PersistedStore,
    expectedRevision: number
  ): Promise<PersistedStore> {
    const current = await this.load();

    if (current.revision !== expectedRevision) {
      throw new AppError("STALE_REVISION", `Revision mismatch: expected ${expectedRevision}, found ${current.revision}`, {
        expected: expectedRevision,
        found: current.revision,
      });
    }

    const nextState = updater({ ...current });
    nextState.revision = current.revision + 1;

    const validation = PersistedStoreSchema.safeParse(nextState);
    if (!validation.success) {
      throw new AppError("VALIDATION_FAILED", "Update produced invalid state", { errors: validation.error.flatten() });
    }

    await this.atomicWrite(nextState);
    this.events.emit("change", nextState.revision);
    return nextState;
  }

  async waitForRevision(sinceRevision: number, timeoutMs: number): Promise<number> {
    const current = await this.load();
    if (current.revision > sinceRevision) {
      return current.revision;
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.events.off("change", onUpdate);
        resolve(sinceRevision);
      }, timeoutMs);

      const onUpdate = (newRevision: number) => {
        if (newRevision > sinceRevision) {
          clearTimeout(timer);
          this.events.off("change", onUpdate);
          resolve(newRevision);
        }
      };

      this.events.on("change", onUpdate);
    });
  }

  private async atomicWrite(data: PersistedStore): Promise<void> {
    const tempFile = `.store_temp_${randomUUID()}.json`;
    const serialized = JSON.stringify(data, null, 2);

    let handle;
    try {
      await this.jfs.writeFile(tempFile, serialized);
      
      handle = await this.jfs.open(tempFile, "r+");
      await handle.sync();
      await handle.close();

      await this.jfs.rename(tempFile, this.filePath);
    } catch (err: unknown) {
      try { await this.jfs.unlink(tempFile); } catch { /* Ignore cleanup errors */ }
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError("INTERNAL_ERROR", `Atomic write failed: ${message}`);
    }
  }

  private getDefaultState(): PersistedStore {
    return {
      schemaVersion: 1,
      revision: 1,
      tasks: [],
      ideas: [],
      messages: [],
      locks: [],
      agents: [],
      audit: [],
      panic_mode: false,
      knowledge: { nodes: [], edges: [] },
      adrs: [],
      events: [],
      notifications: [],
      moods: [],
      arbitration: { status: "idle", updated_at: 0 },
      review_gates: []
    };
  }
}