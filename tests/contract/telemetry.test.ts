/**
 * Purpose: Verify ITelemetryClient contract (telemetry seam).
 */
import assert from "node:assert";
import test from "node:test";
import { MockTelemetryClient } from "../../src/lib/mocks/telemetry.mock.js";
import { LogLineSchema } from "../../contracts/telemetry.contract.js";

const mockEvents = [
  { eventType: "change", filename: "probe.log", latency: 100 },
  { eventType: "change", filename: "probe.log", latency: 200 }
];

test("MockTelemetryClient - should yield log lines", async () => {
  const client = new MockTelemetryClient(mockEvents);
  const iterable = client.tail("Gemini", "/tmp/test.log");
  const iterator = iterable[Symbol.asyncIterator]();
  
  const result = await iterator.next();
  assert.strictEqual(result.done, false);
  
  const line = result.value;
  assert.strictEqual(line.source, "Gemini");
  assert.strictEqual(line.content, "Simulated Log Line");
  
  // Validate schema
  assert.doesNotThrow(() => LogLineSchema.parse(line));
});

test("MockTelemetryClient - should return buffer status", async () => {
  const client = new MockTelemetryClient([]);
  const status = await client.getBufferStatus("Gemini");
  assert.strictEqual(status.linesBuffered, 10);
});
