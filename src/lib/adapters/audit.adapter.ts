import { randomUUID } from "crypto";
import type { AuditEvent, AuditListFilter, IAuditLog } from "../../../contracts/audit.contract.js";
import type { IStore, PersistedStore } from "../../../contracts/store.contract.js";
import { AppError } from "../../../contracts/store.contract.js";

export class AuditAdapter implements IAuditLog {
  constructor(private readonly store: IStore) {}

  private async runTransaction<T>(
    operation: (current: PersistedStore) => { nextState: PersistedStore; result: T }
  ): Promise<T> {
    const MAX_RETRIES = 5;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        const current = await this.store.load();
        const { nextState, result } = operation(current);
        await this.store.update(() => nextState, current.revision);
        return result;
      } catch (err: any) {
        if (err.code === "STALE_REVISION") {
          attempt += 1;
          continue;
        }
        throw err;
      }
    }

    throw new AppError("INTERNAL_ERROR", "Failed to record audit event after max retries");
  }

  async record(
    agentId: string,
    tool: string,
    argsSummary: string,
    resultSummary: string,
    errorCode?: string
  ): Promise<AuditEvent> {
    return this.runTransaction((current) => {
      const event: AuditEvent = {
        id: randomUUID(),
        agentId,
        tool,
        timestamp: Date.now(),
        argsSummary,
        resultSummary,
        errorCode,
      };

      const audit = (current.audit as AuditEvent[]) || [];
      return {
        nextState: { ...current, audit: [...audit, event] },
        result: event,
      };
    });
  }

  async list(filter: AuditListFilter = {}): Promise<AuditEvent[]> {
    const current = await this.store.load();
    let list = (current.audit as AuditEvent[]) || [];

    if (filter.agentId) {
      list = list.filter((event) => event.agentId === filter.agentId);
    }
    if (filter.tool) {
      list = list.filter((event) => event.tool === filter.tool);
    }
    if (typeof filter.limit === "number") {
      list = list.slice(-filter.limit);
    }
    return list;
  }
}
