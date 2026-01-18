import fs from "fs";
import type { IMoodLog, MoodEntry, MoodInput, MoodListOptions } from "../../../contracts/mood.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";

export class MockMoodLog implements IMoodLog {
  private entries: MoodEntry[] = [];
  private fixture: any = {};

  constructor(private readonly fixturePath: string, private readonly scenario = "success") {
    if (fs.existsSync(fixturePath)) {
      this.fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      const s = this.fixture.scenarios?.[this.scenario] || this.fixture.scenarios?.["success"];
      if (s?.outputs?.entries) {
        this.entries = s.outputs.entries;
      }
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

  async log(input: MoodInput): Promise<MoodEntry> {
    this.getScenario();
    const entry: MoodEntry = {
      id: "mood-1",
      agentId: input.agentId,
      mood: input.mood,
      timestamp: Date.now(),
    };
    this.entries.push(entry);
    return entry;
  }

  async list(options: MoodListOptions = {}): Promise<MoodEntry[]> {
    this.getScenario();
    return this.entries;
  }
}