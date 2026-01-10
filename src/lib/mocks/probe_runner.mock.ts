/**
 * Purpose: Mock implementation of Probe Runner using fixtures.
 */
import { IProbeRunner, RunProbesInput, ProbeResult } from "../../../contracts/probe_runner.contract.js";

// SDD: Grounded by fixture
const FIXTURE_PATH = "fixtures/probe_runner/capabilities.json";

export class MockProbeRunner implements IProbeRunner {
  constructor(private fixtureData: any) {}

  async run(input: RunProbesInput): Promise<ProbeResult[]> {
    return this.fixtureData.scenarios.map((s: any) => ({
      name: s.name,
      success: s.code === 0,
      code: s.code,
      stdout: s.stdout,
      stderr: s.stderr,
      durationMs: 100
    }));
  }
}
