import fs from "fs";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";
import type { GavelState, IArbitration } from "../../../contracts/arbitration.contract.js";

export class MockArbitration implements IArbitration {
  private state: GavelState = { status: "idle", updated_at: 0 };
  private fixture: any = {};

  constructor(private readonly fixturePath: string, private readonly scenario = "success") {
    if (fs.existsSync(fixturePath)) {
      this.fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      const s = this.fixture.scenarios?.[this.scenario] || this.fixture.scenarios?.["success"];
      if (s?.outputs?.state) {
        this.state = s.outputs.state;
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

  async getState(): Promise<GavelState> {
    this.getScenario();
    return { ...this.state };
  }

  async request(agentId: string): Promise<GavelState> {
    this.getScenario();
    this.state = { status: "requested", requestedBy: agentId, updated_at: Date.now() };
    return this.getState();
  }

  async grant(targetAgentId: string): Promise<GavelState> {
    this.getScenario();
    this.state = { status: "granted", requestedBy: this.state.requestedBy, grantedTo: targetAgentId, updated_at: Date.now() };
    return this.getState();
  }

  async release(): Promise<GavelState> {
    this.getScenario();
    this.state = { status: "idle", updated_at: Date.now() };
    return this.getState();
  }
}