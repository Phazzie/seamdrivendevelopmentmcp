/**
 * Purpose: Mock implementation of the Store (store seam).
 */
import type { IStore, PersistedStore } from "../../../contracts/store.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";
import fs from "fs";

export class MockStore implements IStore {
  private state: PersistedStore;
  private changeListeners: ((rev: number) => void)[] = [];

  constructor(private readonly fixturePath?: string, scenarioOrState: string | Partial<PersistedStore> = "success") {
    if (typeof scenarioOrState === "string") {
      this.state = this.loadInitialState(fixturePath, scenarioOrState);
    } else {
      this.state = {
        ...this.loadInitialState(fixturePath, "success"),
        ...scenarioOrState,
      };
    }
  }

  async load(): Promise<PersistedStore> {
    return JSON.parse(JSON.stringify(this.state));
  }

  async update(
    updater: (current: PersistedStore) => PersistedStore,
    expectedRevision: number
  ): Promise<PersistedStore> {
    if (this.state.revision !== expectedRevision) {
      throw new AppError(
        "STALE_REVISION",
        `Expected revision ${expectedRevision}, but store is at ${this.state.revision}`,
        { current: this.state.revision, expected: expectedRevision }
      );
    }

    const nextState = updater(this.state);
    nextState.revision = this.state.revision + 1;
    this.state = nextState;
    
    this.changeListeners.forEach(l => l(nextState.revision));
    return this.state;
  }

  async waitForRevision(sinceRevision: number, timeoutMs: number): Promise<number> {
    if (this.state.revision > sinceRevision) {
      return this.state.revision;
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.changeListeners = this.changeListeners.filter(l => l !== onUpdate);
        resolve(sinceRevision);
      }, timeoutMs);

      const onUpdate = (newRev: number) => {
        if (newRev > sinceRevision) {
          clearTimeout(timer);
          this.changeListeners = this.changeListeners.filter(l => l !== onUpdate);
          resolve(newRev);
        }
      };

      this.changeListeners.push(onUpdate);
    });
  }

  private loadInitialState(fixturePath?: string, scenario = "success"): PersistedStore {
    const defaultState: PersistedStore = {
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

    if (fixturePath && fs.existsSync(fixturePath)) {
      const raw = fs.readFileSync(fixturePath, "utf-8");
      const fixture = JSON.parse(raw);
      
      const s = (fixture.scenarios && fixture.scenarios[scenario]) || { outputs: fixture };
      
      if (s.error) {
        const code = AppErrorCodeSchema.parse(s.error.code);
        throw new AppError(code, s.error.message, s.error.details);
      }

      const data = s.data || s.outputs || fixture;
      const { captured_at, ...rest } = data;
      // Merge with default to handle missing keys in fixture
      return { ...defaultState, ...rest };
    }

    return defaultState;
  }
}
