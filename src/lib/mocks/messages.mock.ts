import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import type {
  IMessageBridge,
  Message,
  MessageListOptions,
  MessagePostOptions,
  UpdateEvent,
} from "../../../contracts/messages.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "messages", "sample.json");
const BASE_TIME = 1700000003000;

type MessageFixture = {
  captured_at?: string;
  revision?: number;
  messages?: Message[];
};

function loadFixture(): MessageFixture {
  if (!fs.existsSync(FIXTURE_PATH)) return {};
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  return JSON.parse(raw) as MessageFixture;
}

export class MockMessageBridge implements IMessageBridge {
  private messages: Message[];
  private currentRevision: number;
  private clock: number;
  private idIndex: number;
  private bus = new EventEmitter();

  constructor() {
    const fixture = loadFixture();
    this.messages = fixture.messages
      ? fixture.messages.map((message) => ({
        ...message,
        channelId: message.channelId ?? "general",
      }))
      : [];
    this.currentRevision = typeof fixture.revision === "number" ? fixture.revision : 1;
    const timestamps = this.messages.map((msg) => msg.timestamp);
    const maxTime = timestamps.length ? Math.max(...timestamps) : BASE_TIME;
    this.clock = Math.max(BASE_TIME, maxTime + 1);
    this.idIndex = 1;
  }

  async post(sender: string, content: string, options: MessagePostOptions = {}): Promise<Message> {
    const channelId = options.channelId ?? "general";
    const threadId = options.threadId;
    const metadata = options.metadata;
    const msg: Message = {
      id: this.nextId(),
      sender,
      content,
      timestamp: this.nextTime(),
      channelId,
      threadId,
      metadata
    };
    this.messages.push(msg);
    this.currentRevision++;
    this.bus.emit('change', this.currentRevision);
    return msg;
  }

  async list(options: MessageListOptions = {}): Promise<Message[]> {
    let filtered = this.messages;
    if (options.channelId) {
      filtered = filtered.filter((message) => message.channelId === options.channelId);
    }
    if (options.threadId) {
      filtered = filtered.filter((message) => message.threadId === options.threadId);
    }
    const limit = options.limit ?? 50;
    return filtered.slice(-limit);
  }

  async waitForUpdate(sinceRevision: number, timeoutMs: number = 1000): Promise<UpdateEvent | null> {
    // 1. Immediate check
    if (this.currentRevision > sinceRevision) {
      return { revision: this.currentRevision };
    }

    // 2. Wait
    return new Promise((resolve) => {
      let timer: NodeJS.Timeout;

      const listener = (rev: number) => {
        if (rev > sinceRevision) {
          cleanup();
          resolve({ revision: rev });
        }
      };

      const cleanup = () => {
        this.bus.off('change', listener);
        clearTimeout(timer);
      };

      timer = setTimeout(() => {
        this.bus.off('change', listener);
        resolve(null); // Timeout
      }, timeoutMs);

      this.bus.on('change', listener);
    });
  }

  private nextTime(): number {
    const value = this.clock;
    this.clock += 1;
    return value;
  }

  private nextId(): string {
    // Deterministic, collision-free IDs for tests.
    const value = this.idIndex.toString(16).padStart(12, "0");
    this.idIndex += 1;
    return `00000000-0000-0000-0000-${value}`;
  }
}
