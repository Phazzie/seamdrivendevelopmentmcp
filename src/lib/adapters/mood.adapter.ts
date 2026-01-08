import { randomUUID } from "crypto";
import type { IStore } from "../../../contracts/store.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";
import {
  IMoodLog,
  MoodEntry,
  MoodInput,
  MoodInputSchema,
  MoodListOptions,
  MoodListOptionsSchema,
} from "../../../contracts/mood.contract.js";

export class MoodAdapter implements IMoodLog {
  constructor(private readonly store: IStore) {}

  async log(input: MoodInput): Promise<MoodEntry> {
    const parsed = MoodInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid mood entry.", {
        issues: parsed.error.issues,
      });
    }

    return runTransaction(this.store, (current) => {
      const entry: MoodEntry = {
        id: randomUUID(),
        agentId: parsed.data.agentId,
        mood: parsed.data.mood,
        note: parsed.data.note,
        timestamp: Date.now(),
      };

      const moods = Array.isArray(current.moods) ? (current.moods as MoodEntry[]) : [];
      return {
        nextState: { ...current, moods: [...moods, entry] },
        result: entry,
      };
    });
  }

  async list(options: MoodListOptions = {}): Promise<MoodEntry[]> {
    const parsed = MoodListOptionsSchema.safeParse(options ?? {});
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid mood list options.", {
        issues: parsed.error.issues,
      });
    }

    const current = await this.store.load();
    let moods = Array.isArray(current.moods) ? (current.moods as MoodEntry[]) : [];
    if (parsed.data.agentId) {
      moods = moods.filter((entry) => entry.agentId === parsed.data.agentId);
    }
    const limit = parsed.data.limit ?? 50;
    return moods.slice(-limit);
  }
}
