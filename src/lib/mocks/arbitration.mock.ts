import fs from "fs";
import path from "path";
import { AppError } from "../../../contracts/store.contract.js";
import type { GavelState, IArbitration } from "../../../contracts/arbitration.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "arbitration", "sample.json");

type GavelFixture = {
  captured_at?: string;
  state?: GavelState;
};

function loadFixtureState(): GavelState {
  if (!fs.existsSync(FIXTURE_PATH)) {
    return { status: "idle", updated_at: 0 };
  }
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as GavelFixture;
  return parsed.state ?? { status: "idle", updated_at: 0 };
}

export class MockArbitration implements IArbitration {
  private state: GavelState;

  constructor() {
    this.state = loadFixtureState();
  }

  async getState(): Promise<GavelState> {
    return { ...this.state };
  }

  async request(agentId: string): Promise<GavelState> {
    if (!agentId) {
      throw new AppError("VALIDATION_FAILED", "agentId is required.");
    }
    if (this.state.status !== "idle") {
      throw new AppError("VALIDATION_FAILED", "Gavel is already in use.");
    }
    this.state = {
      status: "requested",
      requestedBy: agentId,
      updated_at: Date.now(),
    };
    return this.getState();
  }

  async grant(targetAgentId: string): Promise<GavelState> {
    if (!targetAgentId) {
      throw new AppError("VALIDATION_FAILED", "targetAgentId is required.");
    }
    if (this.state.status !== "requested") {
      throw new AppError("VALIDATION_FAILED", "Gavel must be requested before granting.");
    }
    this.state = {
      status: "granted",
      requestedBy: this.state.requestedBy,
      grantedTo: targetAgentId,
      updated_at: Date.now(),
    };
    return this.getState();
  }

  async release(): Promise<GavelState> {
    this.state = { status: "idle", updated_at: Date.now() };
    return this.getState();
  }
}
