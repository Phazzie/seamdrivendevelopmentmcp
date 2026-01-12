import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import EventEmitter from 'events';
import type { IStore, PersistedStore } from "../../../contracts/store.contract.js";
import { AppError, PersistedStoreSchema } from "../../../contracts/store.contract.js";

export class StoreAdapter implements IStore {
  private readonly filePath: string;
  private readonly events = new EventEmitter();

  constructor(filePath: string) {
    this.filePath = filePath;
    // Set max listeners to avoid warnings if many agents wait at once
    this.events.setMaxListeners(50);
  }

  on(event: 'change', listener: (revision: number) => void): void {
    this.events.on(event, listener);
  }

  off(event: 'change', listener: (revision: number) => void): void {
    this.events.off(event, listener);
  }

  async load(): Promise<PersistedStore> {
    if (!fs.existsSync(this.filePath)) {
      // Default State
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
        review_gates: [],
        experiments: []
      };
    }
    try {
      const content = fs.readFileSync(this.filePath, "utf-8");
      const data = JSON.parse(content);
      // Validate schema
      const result = PersistedStoreSchema.safeParse(data);
      if (!result.success) {
        throw new AppError("VALIDATION_FAILED", "Store corrupted on disk", { errors: result.error });
      }
      return result.data;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError("INTERNAL_ERROR", `Failed to load store: ${err.message}`);
    }
  }

  async update(
    updater: (current: PersistedStore) => PersistedStore,
    expectedRevision: number
  ): Promise<PersistedStore> {
    // 1. Read
    const current = await this.load();

    // 2. OCC Check
    if (current.revision !== expectedRevision) {
      throw new AppError(
        "STALE_REVISION",
        `Expected revision ${expectedRevision}, but store is at ${current.revision}`,
        { current: current.revision, expected: expectedRevision }
      );
    }

    // 3. Update
    const nextState = updater(current);
    nextState.revision = current.revision + 1;

    // 4. Validate before write
    const validation = PersistedStoreSchema.safeParse(nextState);
    if (!validation.success) {
      throw new AppError("VALIDATION_FAILED", "Update produced invalid state", { errors: validation.error });
    }

    // 5. Atomic Write (Temp -> Fsync -> Rename)
    await this.atomicWrite(nextState);

    // 6. Notify
    this.events.emit('change', nextState.revision);

    return nextState;
  }

  private async atomicWrite(data: PersistedStore): Promise<void> {
    const dir = path.dirname(this.filePath);
    const tempFile = path.join(dir, `.store_temp_${randomUUID()}.json`);
    const serialized = JSON.stringify(data, null, 2);

    try {
      // Write to temp
      fs.writeFileSync(tempFile, serialized);
      
      // Fsync file
      const fd = fs.openSync(tempFile, 'r+');
      fs.fsyncSync(fd);
      fs.closeSync(fd);

      // Rename (Atomic)
      fs.renameSync(tempFile, this.filePath);
      
      // Fsync directory (Platform dependent durability)
      if (process.platform !== 'win32') {
         try {
           const dirFd = fs.openSync(dir, 'r');
           fs.fsyncSync(dirFd);
           fs.closeSync(dirFd);
         } catch (e) {
           // Ignore directory fsync errors (EPERM on some systems)
         }
      }

    } catch (err: any) {
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
      throw new AppError("INTERNAL_ERROR", `Failed to write store: ${err.message}`);
    }
  }
}
