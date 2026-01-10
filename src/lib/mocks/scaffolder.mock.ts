/**
 * Purpose: Mock implementation of the Scaffolder (scaffolder seam).
 */
import fs from "fs";
import path from "path";
import { AppError } from "../../../contracts/store.contract.js";
import { IScaffolder, ScaffoldInput, ScaffoldResult } from "../../../contracts/scaffolder.contract.js";

// SDD: Grounded by fixture
const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "scaffolder", "sample.json");

type ScenarioFixture = {
  outputs?: Record<string, { success?: boolean; files?: ScaffoldResult["files"] }>;
  error?: { code: string; message: string };
};

type FixtureFile = {
  captured_at?: string;
  scenarios?: Record<string, ScenarioFixture>;
};

function loadFixture(): FixtureFile {
  if (!fs.existsSync(FIXTURE_PATH)) return {};
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  return JSON.parse(raw) as FixtureFile;
}

export class MockScaffolder implements IScaffolder {
  private readonly fixture: FixtureFile;

  constructor(private scenario = "success") {
    this.fixture = loadFixture();
  }

  async scaffold(input: ScaffoldInput): Promise<ScaffoldResult> {
    const scenarios = this.fixture.scenarios ?? {};
    const scenario = scenarios[this.scenario];
    if (!scenario) {
      throw new AppError("VALIDATION_FAILED", `Unknown scenario: ${this.scenario}`);
    }
    if (scenario.error) {
      throw new AppError("VALIDATION_FAILED", scenario.error.message);
    }

    const output = scenario.outputs?.scaffold;
    if (!output || !Array.isArray(output.files)) {
      throw new AppError("VALIDATION_FAILED", "Missing scaffold output fixture");
    }

    const baseDir = input.baseDir ?? ".";
    const files = output.files.map((file) => ({
      ...file,
      path: file.path.replace("${baseDir}", baseDir)
    }));

    return {
      success: output.success ?? true,
      files
    };
  }
}
