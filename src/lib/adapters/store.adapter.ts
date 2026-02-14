/**
 * Purpose: Asynchronous, Sharded Store implementation (store seam).
 * Hardened: Uses JailedFs. Writes individual files for top-level keys. Atomic Manifest update.
 */
import { randomUUID } from "crypto";
import EventEmitter from "events";
import fs from "fs/promises";
import path from "path";
import {
  PersistedStore,
  PersistedStoreSchema,
  AppError,
  IStore
} from "../../../contracts/store.contract.js";
import { JailedFs } from "../helpers/jailed_fs.js";

const SHARD_DIR_SUFFIX = "_data";

export class StoreAdapter implements IStore {
  private readonly events = new EventEmitter();
  private readonly manifestPath: string;
  private readonly shardDir: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    filePath: string, 
    private readonly jfs: JailedFs
  ) {
    this.manifestPath = filePath;
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    // e.g. store.json -> store_data/
    this.shardDir = path.join(path.dirname(filePath), `${base}${SHARD_DIR_SUFFIX}`);
    this.events.setMaxListeners(100);
  }

  async load(): Promise<PersistedStore> {
    // 1. Try to read Manifest
    if (!this.jfs.exists(this.manifestPath)) {
      const defaultState = this.getDefaultState();
      await this.atomicShardWrite(defaultState);
      return defaultState;
    }

    let manifest: PersistedStore;
    try {
      const content = await this.jfs.readFile(this.manifestPath);
      manifest = JSON.parse(content);
    } catch (err) {
      throw new AppError("INTERNAL_ERROR", "Failed to load store manifest");
    }

    // 2. If legacy monolith (no schemaVersion or no shardDir), migrate in memory? 
    // For V1.1.2, we assume if it exists, it's either legacy or manifest.
    // If it's a manifest, it might have data? 
    // Actually, we'll keep the manifest acting as the "Legacy Store" if shards don't exist.
    if (!this.jfs.exists(this.shardDir)) {
      const result = PersistedStoreSchema.safeParse(manifest);
      if (!result.success) throw new AppError("VALIDATION_FAILED", "Legacy store corrupted", { errors: result.error.flatten() });
      return result.data;
    }

    // 3. Load Shards
    // We treat the manifest as the "skeleton" and fill in the "flesh" from shards.
    const keys = Object.keys(manifest) as (keyof PersistedStore)[];
    const fullState = { ...manifest };

    await Promise.all(keys.map(async (key) => {
      // Skip scalar metadata
      if (typeof fullState[key] !== "object" || fullState[key] === null) return;
      if (key === "arbitration") return; // Keep small objects in manifest? No, shard everything large.

      // We shard arrays and large objects.
      if (Array.isArray(fullState[key]) || key === "knowledge") {
        const shardPath = path.join(this.shardDir, `${key}.json`);
        if (this.jfs.exists(shardPath)) {
          const shardContent = await this.jfs.readFile(shardPath);
          (fullState as Record<string, unknown>)[key] = JSON.parse(shardContent);
        }
      }
    }));

    const result = PersistedStoreSchema.safeParse(fullState);
    if (!result.success) {
      throw new AppError("VALIDATION_FAILED", "Sharded store corrupted", { errors: result.error.flatten() });
    }
    return result.data;
  }

  async update(
    updater: (current: PersistedStore) => PersistedStore,
    expectedRevision: number
  ): Promise<PersistedStore> {
    return this.withWriteLock(async () => {
      const current = await this.load();

      if (current.revision !== expectedRevision) {
        throw new AppError("STALE_REVISION", `Revision mismatch: expected ${expectedRevision}, found ${current.revision}`, {
          expected: expectedRevision,
          found: current.revision,
        });
      }

      const nextState = updater(JSON.parse(JSON.stringify(current)));
      nextState.revision = current.revision + 1;

      const validation = PersistedStoreSchema.safeParse(nextState);
      if (!validation.success) {
        throw new AppError("VALIDATION_FAILED", "Update produced invalid state", { errors: validation.error.flatten() });
      }

      await this.atomicShardWrite(nextState);
      this.events.emit("change", nextState.revision);
      return nextState;
    });
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

  private async atomicShardWrite(next: PersistedStore): Promise<void> {
    const keys = Object.keys(next) as (keyof PersistedStore)[];
    const manifestKeys = ["schemaVersion", "revision", "panic_mode"];
    const nextManifest: Record<string, unknown> = { ...next };
    const stageDir = `${this.shardDir}.stage_${randomUUID()}`;
    const backupDir = `${this.shardDir}.prev_${randomUUID()}`;
    let stageSwapped = false;
    let backupCreated = false;

    try {
      await this.jfs.mkdir(stageDir);

      for (const key of keys) {
        if (manifestKeys.includes(key)) continue;
        const nextVal = next[key];
        const shardPath = path.join(stageDir, `${key}.json`);
        await this.jfs.writeFile(shardPath, JSON.stringify(nextVal, null, 2));

        if (Array.isArray(nextVal)) {
          nextManifest[key] = [];
        } else if (typeof nextVal === "object" && nextVal !== null) {
          if (key === "knowledge") nextManifest[key] = { nodes: [], edges: [] };
          else if (key === "arbitration") nextManifest[key] = { status: "idle", updated_at: 0 };
          else nextManifest[key] = {};
        }
      }

      if (this.jfs.exists(this.shardDir)) {
        await this.jfs.rename(this.shardDir, backupDir);
        backupCreated = true;
      }

      await this.jfs.rename(stageDir, this.shardDir);
      stageSwapped = true;

      await this.jfs.writeFile(this.manifestPath, JSON.stringify(nextManifest, null, 2));
    } catch (err: unknown) {
      if (backupCreated && !stageSwapped) {
        try {
          await this.jfs.rename(backupDir, this.shardDir);
        } catch (restoreErr) {
          console.error("[StoreAdapter] Failed to restore shard directory:", restoreErr);
        }
      }

      const message = err instanceof Error ? err.message : String(err);
      throw new AppError("INTERNAL_ERROR", `Atomic shard write failed: ${message}`);
    } finally {
      if (!stageSwapped) {
        await this.safeRemoveDir(stageDir);
      }
      if (backupCreated && stageSwapped) {
        await this.safeRemoveDir(backupDir);
      }
    }
  }

  private async safeRemoveDir(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (err) {
      console.error("[StoreAdapter] Failed to remove directory:", err);
    }
  }

  private async withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.writeQueue;
    let release: (() => void) | undefined;
    this.writeQueue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await operation();
    } finally {
      release?.();
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
      review_gates: [],
      workers: [],
      worker_runs: []
    };
  }
}
