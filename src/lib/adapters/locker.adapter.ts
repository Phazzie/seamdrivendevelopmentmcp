import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { ILocker, Lock } from "../../../contracts/locker.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import type { IStore, PersistedStore } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";

type NormalizationStrategy = "lowercase" | "none";

const NORMALIZATION_FIXTURE = path.join(process.cwd(), "fixtures", "locker", "capabilities.json");

function loadNormalizationStrategy(): NormalizationStrategy {
  if (!fs.existsSync(NORMALIZATION_FIXTURE)) return "none";
  const raw = fs.readFileSync(NORMALIZATION_FIXTURE, "utf-8");
  const data = JSON.parse(raw) as { normalization_strategy?: NormalizationStrategy };
  return data.normalization_strategy === "lowercase" ? "lowercase" : "none";
}

export class LockerAdapter implements ILocker {
  private readonly store: IStore;
  private readonly normalization: NormalizationStrategy;

  constructor(store: IStore) {
    this.store = store;
    this.normalization = loadNormalizationStrategy();
  }

  async acquire(resources: string[], ownerId: string, ttlMs: number, reason?: string): Promise<Lock[]> {
    return runTransaction(this.store, (current) => {
      if (current.panic_mode) {
        throw new AppError("PANIC_MODE", "System is in panic mode. All locks are frozen.");
      }
      const now = Date.now();
      const activeLocks = (current.locks as Lock[] || []).filter(l => l.expiresAt > now);
      const acquiredLocks: Lock[] = [];
      const normalizedResources = this.normalizeResources(resources);

      // Check conflicts
      for (const res of normalizedResources) {
        const existing = activeLocks.find(l => l.resource === res);
        if (existing && existing.ownerId !== ownerId) {
           throw new AppError("LOCKED", `Resource ${res} is locked by ${existing.ownerId}`, { lock: existing });
        }
      }

      // Update locks
      const nextLocks = [...activeLocks];
      
      for (const res of normalizedResources) {
        // Remove self-owned existing lock (re-entrancy)
        const idx = nextLocks.findIndex(l => l.resource === res);
        if (idx !== -1) nextLocks.splice(idx, 1);

        const lock: Lock = {
          id: randomUUID(),
          resource: res,
          ownerId,
          createdAt: now,
          expiresAt: now + ttlMs,
          reason
        };
        nextLocks.push(lock);
        acquiredLocks.push(lock);
      }

      return {
        nextState: { ...current, locks: nextLocks },
        result: acquiredLocks
      };
    });
  }

  async release(resources: string[], ownerId: string): Promise<void> {
    return runTransaction(this.store, (current) => {
      const normalizedResources = this.normalizeResources(resources);
      const nextLocks = (current.locks as Lock[] || []).filter(l => {
        const isTarget = normalizedResources.includes(l.resource);
        const isOwner = l.ownerId === ownerId;
        return !(isTarget && isOwner);
      });

      return {
        nextState: { ...current, locks: nextLocks },
        result: undefined
      };
    });
  }

  async renew(resources: string[], ownerId: string, ttlMs: number): Promise<Lock[]> {
    return runTransaction(this.store, (current) => {
      const now = Date.now();
      const activeLocks = (current.locks as Lock[] || []).filter(l => l.expiresAt > now);
      const normalizedResources = this.normalizeResources(resources);
      const updatedLocks: Lock[] = [];

      for (const res of normalizedResources) {
        const existing = activeLocks.find(l => l.resource === res);
        if (!existing) {
          throw new AppError("VALIDATION_FAILED", `Resource ${res} is not locked`);
        }
        if (existing.ownerId !== ownerId) {
          throw new AppError("LOCKED", `Resource ${res} is locked by ${existing.ownerId}`, { lock: existing });
        }
      }

      const nextLocks = [...activeLocks];
      for (const res of normalizedResources) {
        const idx = nextLocks.findIndex(l => l.resource === res);
        if (idx === -1) continue;
        const updated = { ...nextLocks[idx], expiresAt: now + ttlMs };
        nextLocks[idx] = updated;
        updatedLocks.push(updated);
      }

      return {
        nextState: { ...current, locks: nextLocks },
        result: updatedLocks
      };
    });
  }

  async list(): Promise<Lock[]> {
    const current = await this.store.load();
    const now = Date.now();
    return (current.locks as Lock[] || []).filter(l => l.expiresAt > now);
  }

  async forceRelease(resources: string[]): Promise<void> {
    return runTransaction(this.store, (current) => {
       const normalizedResources = this.normalizeResources(resources);
       const nextLocks = (current.locks as Lock[] || []).filter(l => !normalizedResources.includes(l.resource));
       return {
         nextState: { ...current, locks: nextLocks },
         result: undefined
       };
    });
  }

  private normalizeResources(resources: string[]): string[] {
    const normalized = resources.map((res) => this.normalizeResource(res));
    return Array.from(new Set(normalized));
  }

  private normalizeResource(resource: string): string {
    const resolved = path.resolve(resource);
    return this.normalization === "lowercase" ? resolved.toLowerCase() : resolved;
  }
}
