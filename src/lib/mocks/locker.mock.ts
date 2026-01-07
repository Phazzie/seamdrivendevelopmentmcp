import type { ILocker, Lock } from "../../../contracts/locker.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import fs from "fs";
import path from "path";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "locker", "capabilities.json");
const DETERMINISTIC_IDS = [
  "00000000-0000-0000-0000-000000000010",
  "00000000-0000-0000-0000-000000000011",
  "00000000-0000-0000-0000-000000000012",
];

type NormalizationStrategy = "lowercase" | "none";

function loadNormalizationStrategy(): NormalizationStrategy {
  if (!fs.existsSync(FIXTURE_PATH)) return "none";
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const data = JSON.parse(raw) as { normalization_strategy?: NormalizationStrategy };
  return data.normalization_strategy === "lowercase" ? "lowercase" : "none";
}

export class MockLocker implements ILocker {
  private locks: Map<string, Lock> = new Map();
  private readonly normalization: NormalizationStrategy;
  private idIndex = 0;

  constructor() {
    this.normalization = loadNormalizationStrategy();
  }

  async acquire(resources: string[], ownerId: string, ttlMs: number, reason?: string): Promise<Lock[]> {
    const now = Date.now();
    const acquired: Lock[] = [];
    const normalizedResources = this.normalizeResources(resources);

    // Check for conflicts
    for (const res of normalizedResources) {
      const existing = this.locks.get(res);
      if (existing && existing.expiresAt > now && existing.ownerId !== ownerId) {
        throw new AppError("LOCKED", `Resource ${res} is locked by ${existing.ownerId}`);
      }
    }

    // Grant locks
    for (const res of normalizedResources) {
      const lock: Lock = {
        id: this.nextId(),
        resource: res,
        ownerId,
        createdAt: now,
        expiresAt: now + ttlMs,
        reason
      };
      this.locks.set(res, lock);
      acquired.push(lock);
    }

    return acquired;
  }

  async release(resources: string[], ownerId: string): Promise<void> {
    const normalizedResources = this.normalizeResources(resources);
    for (const res of normalizedResources) {
      const existing = this.locks.get(res);
      if (existing && existing.ownerId === ownerId) {
        this.locks.delete(res);
      }
    }
  }

  async renew(resources: string[], ownerId: string, ttlMs: number): Promise<Lock[]> {
    const now = Date.now();
    const normalizedResources = this.normalizeResources(resources);
    const updated: Lock[] = [];

    for (const res of normalizedResources) {
      const existing = this.locks.get(res);
      if (!existing || existing.expiresAt <= now) {
        this.locks.delete(res);
        throw new AppError("VALIDATION_FAILED", `Resource ${res} is not locked`);
      }
      if (existing.ownerId !== ownerId) {
        throw new AppError("LOCKED", `Resource ${res} is locked by ${existing.ownerId}`);
      }
      const renewed = { ...existing, expiresAt: now + ttlMs };
      this.locks.set(res, renewed);
      updated.push(renewed);
    }

    return updated;
  }

  async list(): Promise<Lock[]> {
    const now = Date.now();
    return Array.from(this.locks.values()).filter(l => l.expiresAt > now);
  }

  async forceRelease(resources: string[]): Promise<void> {
    const normalizedResources = this.normalizeResources(resources);
    for (const res of normalizedResources) {
      this.locks.delete(res);
    }
  }

  private normalizeResources(resources: string[]): string[] {
    const normalized = resources.map((res) => this.normalizeResource(res));
    return Array.from(new Set(normalized));
  }

  private normalizeResource(resource: string): string {
    const resolved = path.resolve(resource);
    return this.normalization === "lowercase" ? resolved.toLowerCase() : resolved;
  }

  private nextId(): string {
    const value = DETERMINISTIC_IDS[Math.min(this.idIndex, DETERMINISTIC_IDS.length - 1)];
    this.idIndex += 1;
    return value;
  }
}
