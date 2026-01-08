import { randomUUID } from "crypto";
import type { IStore } from "../../../contracts/store.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";
import {
  Event,
  EventInput,
  EventInputSchema,
  EventListOptions,
  EventListOptionsSchema,
  EventSubscription,
  EventSubscriptionSchema,
  IEventStream,
} from "../../../contracts/event_stream.contract.js";

export class EventStreamAdapter implements IEventStream {
  constructor(private readonly store: IStore) {}

  async publish(input: EventInput): Promise<Event> {
    const parsed = EventInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid event input.", {
        issues: parsed.error.issues,
      });
    }

    return runTransaction(this.store, (current) => {
      const event: Event = {
        id: randomUUID(),
        type: parsed.data.type,
        data: parsed.data.data,
        timestamp: Date.now(),
      };

      const events = Array.isArray(current.events) ? (current.events as Event[]) : [];
      return {
        nextState: { ...current, events: [...events, event] },
        result: event,
      };
    });
  }

  async list(options: EventListOptions = {}): Promise<Event[]> {
    const parsed = EventListOptionsSchema.safeParse(options ?? {});
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid event list options.", {
        issues: parsed.error.issues,
      });
    }

    const current = await this.store.load();
    let events = Array.isArray(current.events) ? (current.events as Event[]) : [];

    if (parsed.data.type) {
      events = events.filter((event) => event.type === parsed.data.type);
    }
    if (typeof parsed.data.since === "number") {
      events = events.filter((event) => event.timestamp > parsed.data.since!);
    }

    const limit = parsed.data.limit ?? 50;
    return events.slice(-limit);
  }

  async waitForEvents(options: EventSubscription = {}): Promise<Event[] | null> {
    const parsed = EventSubscriptionSchema.safeParse(options ?? {});
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid event subscription.", {
        issues: parsed.error.issues,
      });
    }

    const since = parsed.data.since ?? 0;
    const type = parsed.data.type;
    const limit = parsed.data.limit;
    const timeoutMs = parsed.data.timeoutMs ?? 1000;

    const immediate = await this.list({ since, type, limit });
    if (immediate.length) return immediate;

    return new Promise((resolve) => {
      let timer: NodeJS.Timeout;
      let resolved = false;

      const cleanup = () => {
        this.store.off("change", listener);
        clearTimeout(timer);
      };

      const listener = async () => {
        if (resolved) return;
        const fresh = await this.list({ since, type, limit });
        if (fresh.length) {
          resolved = true;
          cleanup();
          resolve(fresh);
        }
      };

      timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(null);
      }, timeoutMs);

      this.store.on("change", listener);
    });
  }
}
