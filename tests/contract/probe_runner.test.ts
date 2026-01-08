/**
 * Purpose: Verify Probe Runner contract compliance.
 */
import assert from "node:assert";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MockProbeRunner } from "../../src/lib/mocks/probe_runner.mock.js";
import { ProbeResultSchema } from "../../contracts/probe_runner.contract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAPABILITIES_FIXTURE = path.join(__dirname, "../../../fixtures/probe_runner/capabilities.json");

test("Probe Runner Contract - Mock Verification", async () => {
  const fixture = JSON.parse(fs.readFileSync(CAPABILITIES_FIXTURE, "utf-8"));
  const runner = new MockProbeRunner(fixture);
  
  const results = await runner.run({ pattern: "test" });
  
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].success, true);
  assert.strictEqual(results[1].success, false);
  
  // Validate schema
  assert.doesNotThrow(() => ProbeResultSchema.parse(results[0]));
});
