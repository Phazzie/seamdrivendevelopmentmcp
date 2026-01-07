import type { IStatusReader, StatusSnapshot } from "../../../contracts/status.contract.js";
import type { IStore } from "../../../contracts/store.contract.js";

export class StatusAdapter implements IStatusReader {
  private readonly startedAt: number;

  constructor(private readonly store: IStore) {
    this.startedAt = Date.now();
  }

  async getStatus(): Promise<StatusSnapshot> {
    const data = await this.store.load();
    return {
      revision: data.revision,
      panicMode: data.panic_mode,
      lockCount: data.locks.length,
      taskCount: data.tasks.length,
      messageCount: data.messages.length,
      agentCount: data.agents.length,
      uptimeMs: Date.now() - this.startedAt,
    };
  }
}
