import fs from "fs";
import { ITelemetryClient, LogLine, BufferStatus } from "../../../contracts/telemetry.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";

export class MockTelemetryClient implements ITelemetryClient {
  private fixture: any = {};

  constructor(private readonly fixturePath: string, private readonly scenario = "success") {
    if (fs.existsSync(fixturePath)) {
      this.fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
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

  async *tail(sourceId: string, filePath: string): AsyncIterable<LogLine> {
    this.getScenario();
    yield { source: sourceId, content: "Mock line", timestamp: Date.now() };
  }

  async getBufferStatus(sourceId: string): Promise<BufferStatus> {
    this.getScenario();
    return { linesBuffered: 0, bytesBuffered: 0, usagePercent: 0 };
  }
}