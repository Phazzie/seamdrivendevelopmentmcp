/**
 * Purpose: Asynchronous, Mandate-compliant Store implementation (store seam).
 * Hardened: Path Jailing enforced via PathGuard.
 */
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import EventEmitter from "events";
import { 
  PersistedStore, 
  PersistedStoreSchema, 
  AppError,
  IStore
} from "../../../contracts/store.contract.js";
import { PathGuard } from "../helpers/path_guard.js";

export class StoreAdapter implements IStore {
  private readonly events = new EventEmitter();
  private readonly filePath: string;

  constructor(filePath: string, private readonly pathGuard: PathGuard) {
    this.events.setMaxListeners(100);
    // Senior Mandate: Validate path on construction
    this.filePath = path.resolve(filePath);
  }

  async load(): Promise<PersistedStore> {
    // Senior Mandate: Jail every read
    await this.pathGuard.validate(this.filePath);

    if (!existsSync(this.filePath)) {
      return this.getDefaultState();
    }

    try {
      const content = await fs.readFile(this.filePath, "utf-8");
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
    const dir = path.dirname(this.filePath);
    // Senior Mandate: Jail every write
    await this.pathGuard.validate(dir);
    
    const tempFile = path.join(dir, `.store_temp_${randomUUID()}.json`);
    const serialized = JSON.stringify(data, null, 2);

    let handle;
    try {
      await fs.writeFile(tempFile, serialized, "utf-8");
      
      handle = await fs.open(tempFile, "r+");
      await handle.sync();
      await handle.close();

      await fs.rename(tempFile, this.filePath);

      if (process.platform !== "win32") {
        let dirHandle;
        try {
          dirHandle = await fs.open(dir, "r");
          await dirHandle.sync();
          await dirHandle.close();
        } catch { /* Ignore directory sync errors */ }
      }
    } catch (err: unknown) {
      try { await fs.unlink(tempFile); } catch { /* Ignore cleanup errors */ }
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
