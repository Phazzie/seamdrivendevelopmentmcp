import fs from "fs";
import type { Adr, AdrInput, AdrStatus, IAdrLog } from "../../../contracts/adr.contract.js";

type AdrFixture = {
  captured_at?: string;
  adrs?: Adr[];
};

export class MockAdrLog implements IAdrLog {
  private adrs: Adr[];
  private clock: number;
  private idIndex: number;

  constructor(private readonly fixturePath: string) {
    this.adrs = this.loadFixtureAdrs(fixturePath);
    const times = this.adrs.map((entry) => entry.created_at);
    const maxTime = times.length ? Math.max(...times) : 1700000400000;
    this.clock = Math.max(1700000400000, maxTime + 1);
    this.idIndex = 1;
  }

  private loadFixtureAdrs(fixturePath: string): Adr[] {
    if (!fs.existsSync(fixturePath)) return [];
    const raw = fs.readFileSync(fixturePath, "utf-8");
    const parsed = JSON.parse(raw) as AdrFixture;
    return Array.isArray(parsed.adrs) ? parsed.adrs : [];
  }

  async create(input: AdrInput): Promise<Adr> {
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