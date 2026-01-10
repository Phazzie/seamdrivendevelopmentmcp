// Purpose: provide fixture-backed TUI mock client (tui seam).
import fs from "fs";
import path from "path";
import {
  ITuiDataClient,
  TuiChatFixture,
  TuiChatFixtureSchema,
  TuiChatMessage,
  TuiChatScenario,
  TuiCommand,
  TuiCommandResult,
  TuiHealthSnapshot,
  TuiPane,
  TuiSendMessage,
  TuiTarget,
} from "../../../contracts/tui.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "tui", "chat_simulation.json");
const BASE_TIME = 1700000004000;
const DEFAULT_SCENARIO = "idle";
const DEFAULT_LEADER_PANE: TuiPane = "left";
const DEFAULT_BROADCAST_HEADER = "BROADCAST -> ALL";

type MockOptions = {
  scenario?: string;
  leaderPane?: TuiPane;
};

function loadFixture(): TuiChatFixture {
  if (!fs.existsSync(FIXTURE_PATH)) return { scenarios: {} };
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const result = TuiChatFixtureSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid TUI fixture: ${result.error.message}`);
  }
  return result.data;
}

function loadScenario(fixture: TuiChatFixture, scenario: string): TuiChatScenario {
  const selected = fixture.scenarios[scenario];
  if (!selected) {
    throw new Error(`Unknown TUI scenario: ${scenario}`);
  }
  return selected;
}

export class MockTuiDataClient implements ITuiDataClient {
  private history: TuiChatMessage[];
  private health: TuiHealthSnapshot;
  private leaderPane: TuiPane;
  private clock: number;
  private idIndex: number;
  private lastTarget: TuiTarget;

  constructor(options: MockOptions = {}) {
    const fixture = loadFixture();
    const scenario = options.scenario ?? DEFAULT_SCENARIO;
    const selected = loadScenario(fixture, scenario);
    this.history = [...selected.history];
    this.health = selected.health;
    this.leaderPane = options.leaderPane ?? DEFAULT_LEADER_PANE;
    this.lastTarget = this.leaderPane;

    const timestamps = this.history.map((msg) => msg.timestamp);
    const maxTime = timestamps.length ? Math.max(...timestamps) : BASE_TIME;
    this.clock = Math.max(BASE_TIME, maxTime + 1);
    this.idIndex = 1;
  }

  async getChatHistory(): Promise<TuiChatMessage[]> {
    return this.history.map((msg) => ({
      ...msg,
      metadata: { ...msg.metadata },
    }));
  }

  async getHealth(): Promise<TuiHealthSnapshot> {
    return JSON.parse(JSON.stringify(this.health));
  }

  async execute(command: TuiCommand): Promise<TuiCommandResult> {
    switch (command.type) {
      case "send_message":
        this.appendMessage(command.message);
        return { ok: true };
      case "set_target":
        this.lastTarget = command.target;
        return { ok: true };
      case "set_leader_pane":
        this.leaderPane = command.leaderPane;
        return { ok: true };
      default:
        return {
          ok: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Unknown TUI command",
            details: { type: (command as { type?: string }).type },
          },
        };
    }
  }

  private appendMessage(message: TuiSendMessage): void {
    if (message.target === "broadcast") {
      const metadata = { ...message.metadata };
      if (!metadata.broadcastHeader) {
        metadata.broadcastHeader = DEFAULT_BROADCAST_HEADER;
      }
      this.history.push(this.buildMessage(message, "left", metadata));
      this.history.push(this.buildMessage(message, "right", metadata));
      return;
    }
    this.history.push(this.buildMessage(message, message.target, message.metadata ?? {}));
  }

  private buildMessage(
    message: TuiSendMessage,
    pane: TuiPane,
    metadata: TuiChatMessage["metadata"]
  ): TuiChatMessage {
    return {
      id: this.nextId(),
      timestamp: this.nextTime(),
      author: "User",
      content: message.content,
      pane,
      target: message.target,
      role: message.role ?? "none",
      metadata,
    };
  }

  private nextTime(): number {
    const value = this.clock;
    this.clock += 1;
    return value;
  }

  private nextId(): string {
    const value = this.idIndex.toString(16).padStart(12, "0");
    this.idIndex += 1;
    return `00000000-0000-0000-0000-${value}`;
  }
}
