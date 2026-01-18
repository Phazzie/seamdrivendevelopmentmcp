import { describe, it } from "node:test";
import assert from "node:assert";
import path from "path";
import { MockProbeRunner } from "../../src/lib/mocks/probe_runner.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "probe_runner", "capabilities.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "probe_runner", "fault.json");

describe("Probe Runner Contract - Mock Verification", () => {
  it("should fail on fault fixture (compilation_error)", async () => {
    const mock = new MockProbeRunner(FAULT_PATH, "compilation_error");
    await assert.rejects(async () => {
      await mock.run({ pattern: "any" });
    }, (err: any) => err.code === "VALIDATION_FAILED" && err.message.includes("compilation failed"));
  });
});