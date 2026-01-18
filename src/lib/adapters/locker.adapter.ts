/**
 * Purpose: Real file-locking implementation (locker seam).
 */
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import type { ILocker, Lock } from "../../../contracts/locker.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import type { IStore } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";

type NormalizationStrategy = "lowercase" | "none";

export class LockerAdapter implements ILocker {
  private readonly store: IStore;
  private readonly normalizationPromise: Promise<NormalizationStrategy>;

  constructor(store: IStore, normalizationFixturePath?: string) {
    this.store = store;
    this.normalizationPromise = this.loadNormalizationStrategy(normalizationFixturePath);
  }

  async acquire(resources: string[], ownerId: string, ttlMs: number, reason?: string): Promise<Lock[]> {
    const normalization = await this.normalizationPromise;
    return runTransaction(this.store, (current) => {
      if (current.panic_mode) {
        throw new AppError("PANIC_MODE", "System is in panic mode. All locks are frozen.");
      }

      // Senior Mandate: Surgical Safety Enforcement
      // We only block lock acquisitions if the requested resources are part of an open Review Gate.
      const normalizedResources = this.normalizeResources(resources, normalization);
      const pendingResources = (current.review_gates || [])
        .filter((g: any) => g.status !== "approved")
        .flatMap((g: any) => (g.affectedResources || []).map((r: string) => this.normalizeResource(r, normalization)));

      const conflicts = normalizedResources.filter(r => pendingResources.includes(r));
      if (conflicts.length > 0) {
        throw new AppError("LOCKED", `Resource acquisition blocked by pending Review Gates: ${conflicts.join(", ")}`, {
          conflicts
        });
      }

      const now = Date.now();
      const activeLocks = (current.locks as Lock[] || []).filter(l => l.expiresAt > now);
      const acquiredLocks: Lock[] = [];

      for (const res of normalizedResources) {
        const existing = activeLocks.find(l => l.resource === res);
        if (existing && existing.ownerId !== ownerId) {
           throw new AppError("LOCKED", `Resource ${res} is locked by ${existing.ownerId}`, { lock: existing });
        }
      }

      const nextLocks = [...activeLocks];
      for (const res of normalizedResources) {
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
    const normalization = await this.normalizationPromise;
    return runTransaction(this.store, (current) => {
      const normalizedResources = this.normalizeResources(resources, normalization);
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
    const normalization = await this.normalizationPromise;
    return runTransaction(this.store, (current) => {
      const now = Date.now();
      const activeLocks = (current.locks as Lock[] || []).filter(l => l.expiresAt > now);
      const normalizedResources = this.normalizeResources(resources, normalization);
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
    const normalization = await this.normalizationPromise;
    return runTransaction(this.store, (current) => {
       const normalizedResources = this.normalizeResources(resources, normalization);
       const nextLocks = (current.locks as Lock[] || []).filter(l => !normalizedResources.includes(l.resource));
       return {
         nextState: { ...current, locks: nextLocks },
         result: undefined
       };
    });
  }

  private async loadNormalizationStrategy(fixturePath?: string): Promise<NormalizationStrategy> {
    if (!fixturePath) return "none";
    try {
      await fs.access(fixturePath);
      const raw = await fs.readFile(fixturePath, "utf-8");
      const data = JSON.parse(raw);
      return data.normalization_strategy === "lowercase" ? "lowercase" : "none";
    } catch {
      return "none";
    }
  }

  private normalizeResources(resources: string[], strategy: NormalizationStrategy): string[] {
    const normalized = resources.map((res) => this.normalizeResource(res, strategy));
    return Array.from(new Set(normalized));
  }

  private normalizeResource(resource: string, strategy: NormalizationStrategy): string {
    const resolved = path.resolve(resource);
    return strategy === "lowercase" ? resolved.toLowerCase() : resolved;
  }
}