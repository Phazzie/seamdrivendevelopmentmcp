/**
 * Purpose: Mock telemetry behavior using fixtures (telemetry seam).
 */
import { ITelemetryClient, LogLine, BufferStatus } from "../../../contracts/telemetry.contract.js";

// SDD: Grounded by fixture
const FIXTURE_PATH = "fixtures/telemetry/fs_watch.json";

export class MockTelemetryClient implements ITelemetryClient {
  constructor(private fixtureEvents: any[] = []) {}

  async *tail(sourceId: string, filePath: string): AsyncIterable<LogLine> {
    // Simulate events from fixture
    for (const event of this.fixtureEvents) {
      if (event.eventType === 'change') {
        yield {
          source: sourceId,
          content: "Simulated Log Line",
          timestamp: Date.now()
        };
      }
    }
  }

  async getBufferStatus(sourceId: string): Promise<BufferStatus> {
    return {
      linesBuffered: 10,
      bytesBuffered: 1024,
      usagePercent: 5
    };
  }
}
