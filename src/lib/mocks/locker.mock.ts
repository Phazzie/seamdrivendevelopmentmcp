/**
 * Purpose: Mock implementation for locker using fixtures (locker seam).
 */
import fs from "fs";
import path from "path";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";
import type { ILocker, Lock } from "../../../contracts/locker.contract.js";

type ScenarioFixture = {
  outputs?: any;
  error?: { code: string; message: string; details?: Record<string, unknown> };
};

type FixtureFile = {
  captured_at?: string;
  scenarios?: Record<string, ScenarioFixture>;
};

export class MockLocker implements ILocker {
  private fixture: FixtureFile = {};
  private locks: Map<string, Lock> = new Map();

  constructor(private readonly fixturePath: string, private scenario = "success") {
    if (fs.existsSync(fixturePath)) {
      this.fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    }
  }

  private getScenario(): ScenarioFixture {
    const scenarios = this.fixture.scenarios ?? {};
    const scenario = scenarios[this.scenario] || scenarios["success"] || {};
    if (scenario.error) {
      const code = AppErrorCodeSchema.parse(scenario.error.code);
      throw new AppError(code, scenario.error.message, scenario.error.details);
    }
    return scenario;
  }

  async acquire(resources: string[], ownerId: string, ttlMs: number, reason?: string): Promise<Lock[]> {
    this.getScenario();
    const now = Date.now();
    const acquired: Lock[] = [];
    const normalized = resources.map(r => path.resolve(r));

    for (const res of normalized) {
      const existing = this.locks.get(res);
      if (existing && existing.expiresAt > now && existing.ownerId !== ownerId) {
        throw new AppError("LOCKED", `Resource ${res} is locked by ${existing.ownerId}`);
      }
    }

    for (const res of normalized) {
      const lock: Lock = {
        id: `lock-${res}`,
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
    this.getScenario();
    for (const res of resources) {
      this.locks.delete(path.resolve(res));
    }
  }

  async renew(resources: string[], ownerId: string, ttlMs: number): Promise<Lock[]> {
    this.getScenario();
    const now = Date.now();
    return resources.map(res => {
      const resPath = path.resolve(res);
      const lock = {
        id: `lock-${resPath}`,
        resource: resPath,
        ownerId,
        createdAt: now,
        expiresAt: now + ttlMs
      };
      this.locks.set(resPath, lock);
      return lock;
    });
  }

  async list(): Promise<Lock[]> {
    this.getScenario();
    const now = Date.now();
    return Array.from(this.locks.values()).filter(l => l.expiresAt > now);
  }

  async forceRelease(resources: string[]): Promise<void> {
    this.getScenario();
    for (const res of resources) {
      this.locks.delete(path.resolve(res));
    }
  }
}
