/**
 * Purpose: Mock implementation of the Scaffolder (scaffolder seam).
 */
import { IScaffolder, ScaffoldInput, ScaffoldResult } from "../../../contracts/scaffolder.contract.js";

// SDD: Grounded by fixture
const FIXTURE_PATH = "fixtures/scaffolder/capabilities.json";

export class MockScaffolder implements IScaffolder {
  async scaffold(input: ScaffoldInput): Promise<ScaffoldResult> {
    if (input.seamName === "invalid") {
      return { success: false, files: [], message: "Invalid seam name" };
    }

    const { seamName, baseDir } = input;
    return {
      success: true,
      files: [
        { path: `${baseDir}/contracts/${seamName}.contract.ts`, type: "contract" },
        { path: `${baseDir}/probes/${seamName}.probe.ts`, type: "probe" },
        { path: `${baseDir}/fixtures/${seamName}/default.json`, type: "fixture" },
        { path: `${baseDir}/src/lib/mocks/${seamName}.mock.ts`, type: "mock" },
        { path: `${baseDir}/tests/contract/${seamName}.test.ts`, type: "test" },
        { path: `${baseDir}/src/lib/adapters/${seamName}.adapter.ts`, type: "adapter" },
      ]
    };
  }
}
