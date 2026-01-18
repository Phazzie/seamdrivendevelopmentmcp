import { EventEmitter } from "events";
import fs from "fs";
import type {
  Event,
  EventInput,
  EventListOptions,
  EventSubscription,
  IEventStream,
} from "../../../contracts/event_stream.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";

export class MockEventStream implements IEventStream {
  private fixture: any = {};
  private bus = new EventEmitter();

  constructor(private readonly fixturePath: string, private readonly scenario = "success") {
    if (fs.existsSync(fixturePath)) {
      this.fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    }
  }

  private getScenario(): any {
    const scenarios = this.fixture.scenarios ?? {};
    const scenario = scenarios[this.scenario] || scenarios["success"] || {};
    if (scenario.error) {
      const code = AppErrorCodeSchema.parse(scenario.error.code);
      throw new AppError(code, scenario.error.message);
    }
    return scenario;
  }

  async publish(input: EventInput): Promise<Event> {
    this.getScenario();
    return { id: "e-1", type: input.type, timestamp: Date.now(), data: input.data };
  }

  async list(options: EventListOptions = {}): Promise<Event[]> {
    this.getScenario();
    return [];
  }

  async waitForEvents(options: EventSubscription = {}): Promise<Event[] | null> {
    this.getScenario();
    return null;
  }
}