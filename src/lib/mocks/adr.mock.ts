import fs from "fs";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";
import type { Adr, AdrInput, AdrStatus, IAdrLog } from "../../../contracts/adr.contract.js";

type ScenarioFixture = {
  outputs?: any;
  error?: { code: string; message: string; details?: Record<string, unknown> };
};

type FixtureFile = {
  captured_at: string;
  scenarios: Record<string, ScenarioFixture>;
};

export class MockAdrLog implements IAdrLog {
  private adrs: Adr[] = [];
  private clock: number;
  private idIndex: number;
  private fixture: FixtureFile | null = null;

  constructor(private readonly fixturePath?: string, private readonly scenario = "success") {
    if (fixturePath && fs.existsSync(fixturePath)) {
      const raw = fs.readFileSync(fixturePath, "utf-8");
      this.fixture = JSON.parse(raw);
      const scenarios = this.fixture?.scenarios || {};
      const s = scenarios[this.scenario] || scenarios["success"];
      if (s?.outputs?.adrs) {
        this.adrs = s.outputs.adrs;
      }
    }
    const times = this.adrs.map((entry) => entry.created_at);
    const maxTime = times.length ? Math.max(...times) : 1700000400000;
    this.clock = Math.max(1700000400000, maxTime + 1);
    this.idIndex = 1;
  }

  private getScenario(): any {
    const scenarios = this.fixture?.scenarios ?? {};
    const scenario = scenarios[this.scenario] || scenarios["success"] || {};
    if (scenario.error) {
      const code = AppErrorCodeSchema.parse(scenario.error.code);
      throw new AppError(code, scenario.error.message);
    }
    return scenario;
  }

  async create(input: AdrInput): Promise<Adr> {
    this.getScenario();
    const entry: Adr = {
      id: this.nextId(),
      title: input.title,
      status: input.status ?? "proposed",
      context: input.context,
      decision: input.decision,
      created_at: this.nextTime(),
    };
    this.adrs.push(entry);
    return entry;
  }

  async list(status?: AdrStatus): Promise<Adr[]> {
    this.getScenario();
    if (status) {
      return this.adrs.filter((entry) => entry.status === status);
    }
    return [...this.adrs];
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
