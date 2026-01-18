import fs from "fs";
import { AppError } from "../../../contracts/store.contract.js";
import type { IWebCockpit } from "../../../contracts/web_cockpit.contract.js";

export class MockWebCockpit implements IWebCockpit {
  private fixture: any;
  constructor(private fixturePath: string, private scenario = "success") {
    this.fixture = JSON.parse(fs["readFileSync"](fixturePath, "utf-8"));
  }
  private getOutput(method: string) {
    const s = this.fixture.scenarios[this.scenario];
    if (!s) throw new AppError("VALIDATION_FAILED", "Unknown scenario");
    if (s.error) throw new AppError(s.error.code, s.error.message);
    return s.outputs[method];
  }
  async start(): Promise<any> { return this.getOutput("start"); }

  async stop(): Promise<any> { return this.getOutput("stop"); }
}
