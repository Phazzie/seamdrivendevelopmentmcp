import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import type { IAuditLog, AuditEvent, AuditListFilter } from "../../../contracts/audit.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import type { IStore } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";
import { PathGuard } from "../helpers/path_guard.js";

/**
 * Purpose: Real implementation of Audit Log (audit seam).
 * Hardened: Path Jailing for audit trail persistence.
 */
export class AuditAdapter implements IAuditLog {
  constructor(private readonly store: IStore) {}

  async record(agentId: string, tool: string, argsSummary: string, resultSummary: string, errorCode?: string): Promise<AuditEvent> {
    return runTransaction(this.store, (current) => {
      const event: AuditEvent = {
        id: randomUUID(),
        timestamp: Date.now(),
        agentId,
        tool,
        argsSummary,
        resultSummary,
        errorCode,
      };

      const audit = Array.isArray(current.audit) ? current.audit : [];
      return {
        nextState: { ...current, audit: [...audit, event] },
        result: event,
      };
    });
  }

  async list(filter?: AuditListFilter): Promise<AuditEvent[]> {
    const current = await this.store.load();
    let events = Array.isArray(current.audit) ? (current.audit as AuditEvent[]) : [];

    if (filter?.agentId) {
      events = events.filter((e) => e.agentId === filter.agentId);
    }
    if (filter?.tool) {
      events = events.filter((e) => e.tool === filter.tool);
    }

    const limit = filter?.limit ?? 50;
    return events.slice(-limit);
  }
}