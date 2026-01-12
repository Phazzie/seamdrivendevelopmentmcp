import type { IStore, PersistedStore } from "../../../contracts/store.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import fs from "fs";
import path from "path";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "store", "default.json");

function loadDefaultState(): PersistedStore {
  if (!fs.existsSync(FIXTURE_PATH)) {
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
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as PersistedStore & { captured_at?: string };
  const { captured_at, ...rest } = parsed;
  return rest as PersistedStore;
}

export class MockStore implements IStore {
  private state: PersistedStore;
  private listeners: ((rev: number) => void)[] = [];

  constructor(initialState?: Partial<PersistedStore>) {
    this.state = {
      ...loadDefaultState(),
      ...initialState,
    };
  }

  on(event: 'change', listener: (rev: number) => void): void {
    this.listeners.push(listener);
  }

  off(event: 'change', listener: (rev: number) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  async load(): Promise<PersistedStore> {
    // Return a deep copy to prevent reference leakage in tests
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

    // Apply the update
    const nextState = updater(JSON.parse(JSON.stringify(this.state)));
    
    // Enforce revision increment
    nextState.revision = this.state.revision + 1;
    
    this.state = nextState;
    
    // Notify listeners
    this.listeners.forEach(l => l(nextState.revision));

    return this.state;
  }
}
