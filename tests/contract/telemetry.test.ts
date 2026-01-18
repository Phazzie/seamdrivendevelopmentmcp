import { describe, it, test } from "node:test";
import assert from "node:assert";
import path from "path";
import { MockTelemetryClient } from "../../src/lib/mocks/telemetry.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "telemetry", "fs_watch.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "telemetry", "fault.json");

test("MockTelemetryClient - should yield log lines", async () => {
  const mock = new MockTelemetryClient(FIXTURE_PATH);
  const stream = mock.tail("s1", "p1");
  const first = await (stream as any)[Symbol.asyncIterator]().next(); // Fix AsyncIterable call
  assert.ok(first.value || first.done === false); 
});

test("MockTelemetryClient - should fail on fault fixture", async () => {
  const mock = new MockTelemetryClient(FAULT_PATH, "file_unreadable");
  const stream = mock.tail("s1", "p1");
  await assert.rejects(async () => {
    await (stream as any)[Symbol.asyncIterator]().next();
  }, (err: any) => err.code === "INTERNAL_ERROR" && err.message.includes("unreadable"));
});
