import fs from "fs";
import path from "path";
import type { IMoodLog, MoodEntry, MoodInput, MoodListOptions } from "../../../contracts/mood.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "mood", "sample.json");
const BASE_TIME = 1700000700000;

type MoodFixture = {
  captured_at?: string;
  entries?: MoodEntry[];
};

function loadFixtureEntries(): MoodEntry[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as MoodFixture;
  return Array.isArray(parsed.entries) ? parsed.entries : [];
}

export class MockMoodLog implements IMoodLog {
  private entries: MoodEntry[];
  private clock: number;
  private idIndex: number;

  constructor() {
    this.entries = loadFixtureEntries();
    const times = this.entries.map((entry) => entry.timestamp);
    const maxTime = times.length ? Math.max(...times) : BASE_TIME;
    this.clock = Math.max(BASE_TIME, maxTime + 1);
    this.idIndex = 1;
  }

  async log(input: MoodInput): Promise<MoodEntry> {
    const entry: MoodEntry = {
      id: this.nextId(),
      agentId: input.agentId,
      mood: input.mood,
      note: input.note,
      timestamp: this.nextTime(),
    };
    this.entries.push(entry);
    return entry;
  }

  async list(options: MoodListOptions = {}): Promise<MoodEntry[]> {
    let list = [...this.entries];
    if (options.agentId) {
      list = list.filter((entry) => entry.agentId === options.agentId);
    }
    const limit = options.limit ?? 50;
    return list.slice(-limit);
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
