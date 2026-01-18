import fs from "fs";
import type { 
  ITuiDataClient, 
  TuiChatMessage, 
  TuiHealthSnapshot 
} from "../../../contracts/tui.contract.js";

type FixtureFile = {
  scenarios: Record<string, { history: TuiChatMessage[], health: TuiHealthSnapshot }>;
};

/**
 * Purpose: Mock TUI client using scenarios (tui seam).
 * Hardened: Read-only.
 */
export class MockTuiDataClient implements ITuiDataClient {
  private fixture: FixtureFile | null = null;

  constructor(private readonly fixturePath?: string, private readonly scenario = "idle") {
    if (fixturePath && fs.existsSync(fixturePath)) {
      this.fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    }
  }

  async getChatHistory(): Promise<TuiChatMessage[]> {
    return this.fixture?.scenarios[this.scenario]?.history || [];
  }

  async getHealth(): Promise<TuiHealthSnapshot> {
    return this.fixture?.scenarios[this.scenario]?.health || {
      persistence: { status: "healthy", latencyMs: 0 },
      telemetry: { status: "healthy", bufferUsage: 0 },
      state: { status: "synced", driftMs: 0 },
      command: { status: "healthy", lastResult: "success" },
      compliance: { status: "healthy", score: 1 }
    };
  }
}