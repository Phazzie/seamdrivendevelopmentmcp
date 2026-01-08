import { randomUUID } from "crypto";
import type { IStore } from "../../../contracts/store.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";
import {
  Adr,
  AdrInput,
  AdrInputSchema,
  AdrStatus,
  IAdrLog,
} from "../../../contracts/adr.contract.js";

export class AdrAdapter implements IAdrLog {
  constructor(private readonly store: IStore) {}

  async create(input: AdrInput): Promise<Adr> {
    const parsed = AdrInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid ADR input.", {
        issues: parsed.error.issues,
      });
    }

    return runTransaction(this.store, (current) => {
      const now = Date.now();
      const entry: Adr = {
        id: randomUUID(),
        title: parsed.data.title,
        status: parsed.data.status ?? "proposed",
        context: parsed.data.context,
        decision: parsed.data.decision,
        created_at: now,
      };

      const adrs = Array.isArray(current.adrs) ? (current.adrs as Adr[]) : [];
      const nextState = { ...current, adrs: [...adrs, entry] };

      return { nextState, result: entry };
    });
  }

  async list(status?: AdrStatus): Promise<Adr[]> {
    const current = await this.store.load();
    const adrs = Array.isArray(current.adrs) ? (current.adrs as Adr[]) : [];
    if (status) {
      return adrs.filter((entry) => entry.status === status);
    }
    return adrs;
  }
}
