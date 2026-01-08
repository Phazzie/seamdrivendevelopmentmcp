import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import type {
  Event,
  EventInput,
  EventListOptions,
  EventSubscription,
  IEventStream,
} from "../../../contracts/event_stream.contract.js";
import { AppError } from "../../../contracts/store.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "event_stream", "sample.json");
const BASE_TIME = 1700000500000;

type EventFixture = {
  captured_at?: string;
  events?: Event[];
};

function loadFixture(): EventFixture {
  if (!fs.existsSync(FIXTURE_PATH)) return {};
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  return JSON.parse(raw) as EventFixture;
}

export class MockEventStream implements IEventStream {
  private events: Event[];
  private clock: number;
  private idIndex: number;
  private bus = new EventEmitter();

  constructor() {
    const fixture = loadFixture();
    this.events = fixture.events ? [...fixture.events] : [];
    const times = this.events.map((event) => event.timestamp);
    const maxTime = times.length ? Math.max(...times) : BASE_TIME;
    this.clock = Math.max(BASE_TIME, maxTime + 1);
    this.idIndex = 1;
  }

  async publish(input: EventInput): Promise<Event> {
    if (!input.type) {
      throw new AppError("VALIDATION_FAILED", "Event type is required.");
    }
    const event: Event = {
      id: this.nextId(),
      type: input.type,
      data: input.data,
      timestamp: this.nextTime(),
    };
    this.events.push(event);
    this.bus.emit("change");
    return event;
  }

  async list(options: EventListOptions = {}): Promise<Event[]> {
    let filtered = this.events;
    if (options.type) {
      filtered = filtered.filter((event) => event.type === options.type);
    }
    if (typeof options.since === "number") {
      filtered = filtered.filter((event) => event.timestamp > options.since!);
    }
    const limit = options.limit ?? 50;
    return filtered.slice(-limit);
  }

  async waitForEvents(options: EventSubscription = {}): Promise<Event[] | null> {
    const since = options.since ?? 0;
    const type = options.type;
    const limit = options.limit;
    const timeoutMs = options.timeoutMs ?? 1000;

    const immediate = await this.list({ since, type, limit });
    if (immediate.length) return immediate;

    return new Promise((resolve) => {
      let timer: NodeJS.Timeout;
      let resolved = false;

      const cleanup = () => {
        this.bus.off("change", listener);
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

      this.bus.on("change", listener);
    });
  }

  private nextTime(): number {
    const value = this.clock;
    this.clock += 1;
    return value;
  }

  private nextId(): string {
    const value = this.idIndex.toString().padStart(12, "0");
    this.idIndex += 1;
    return `00000000-0000-0000-0000-${value}`;
  }
}
