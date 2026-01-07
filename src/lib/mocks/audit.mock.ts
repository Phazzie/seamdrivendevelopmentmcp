import fs from "fs";
import path from "path";
import type { AuditEvent, AuditListFilter, IAuditLog } from "../../../contracts/audit.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "audit", "sample.json");
const DETERMINISTIC_IDS = [
  "00000000-0000-0000-0000-000000000020",
  "00000000-0000-0000-0000-000000000021",
];
const BASE_TIME = 1700000001000;

function loadFixture(): AuditEvent | null {
  if (!fs.existsSync(FIXTURE_PATH)) return null;
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as AuditEvent & { captured_at?: string };
  const { captured_at, ...rest } = parsed;
  return rest as AuditEvent;
}

export class MockAuditLog implements IAuditLog {
  private events: AuditEvent[];
  private clock: number;
  private idIndex = 0;

  constructor() {
    const fixture = loadFixture();
    this.events = fixture ? [fixture] : [];
    this.clock = fixture ? Math.max(BASE_TIME, fixture.timestamp + 1) : BASE_TIME;
  }

  async record(
    agentId: string,
    tool: string,
    argsSummary: string,
    resultSummary: string,
    errorCode?: string
  ): Promise<AuditEvent> {
    const event: AuditEvent = {
      id: this.nextId(),
      agentId,
      tool,
      timestamp: this.nextTime(),
      argsSummary,
      resultSummary,
      errorCode,
    };
    this.events.push(event);
    return event;
  }

  async list(filter: AuditListFilter = {}): Promise<AuditEvent[]> {
    let list = [...this.events];
    if (filter.agentId) {
      list = list.filter((event) => event.agentId === filter.agentId);
    }
    if (filter.tool) {
      list = list.filter((event) => event.tool === filter.tool);
    }
    if (typeof filter.limit === "number") {
      list = list.slice(-filter.limit);
    }
    return list;
  }

  private nextTime(): number {
    const value = this.clock;
    this.clock += 1;
    return value;
  }

  private nextId(): string {
    const value = DETERMINISTIC_IDS[Math.min(this.idIndex, DETERMINISTIC_IDS.length - 1)];
    this.idIndex += 1;
    return value;
  }
}
