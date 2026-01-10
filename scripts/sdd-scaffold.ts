import fs from "fs";
import path from "path";

type WriteResult = {
  created: string[];
  skipped: string[];
};

function usage(): void {
  console.error("Usage: node dist/scripts/sdd-scaffold.js <seam>");
}

function toPascalCase(input: string): string {
  return input
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function writeFileIfMissing(filePath: string, contents: string, result: WriteResult): void {
  if (fs.existsSync(filePath)) {
    result.skipped.push(filePath);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf-8");
  result.created.push(filePath);
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function main(): void {
  const seam = process.argv[2];
  if (!seam) {
    usage();
    process.exitCode = 1;
    return;
  }

  const root = process.cwd();
  const pascal = toPascalCase(seam);
  const result: WriteResult = { created: [], skipped: [] };

  const contractPath = path.join(root, "contracts", `${seam}.contract.ts`);
  const probePath = path.join(root, "probes", `${seam}.probe.ts`);
  const fixturesDir = path.join(root, "fixtures", seam);
  const fixturePath = path.join(fixturesDir, "sample.json");
  const mockPath = path.join(root, "src", "lib", "mocks", `${seam}.mock.ts`);
  const adapterPath = path.join(root, "src", "lib", "adapters", `${seam}.adapter.ts`);
  const testPath = path.join(root, "tests", "contract", `${seam}.test.ts`);

  const contractContents = `/**
 * Purpose: Define contract for ${seam} (seam: ${seam}).
 */
import { z } from "zod";
import { AppErrorCodeSchema } from "./store.contract.js";

// TODO: replace schema and interface with real contract.
export const ${pascal}Schema = z.object({
  // TODO: add fields
});
export type ${pascal} = z.infer<typeof ${pascal}Schema>;

export const ${pascal}ErrorSchema = z.object({
  code: AppErrorCodeSchema,
  message: z.string(),
  details: z.record(z.unknown()).optional()
});
export type ${pascal}Error = z.infer<typeof ${pascal}ErrorSchema>;

export interface I${pascal} {
  // TODO: define contract methods.
}
`;

  const probeContents = `/**
 * Purpose: Probe external reality for ${seam}.
 */
import fs from "fs";
import path from "path";

async function main(): Promise<void> {
  const fixtureDir = path.join(process.cwd(), "fixtures", "${seam}");
  fs.mkdirSync(fixtureDir, { recursive: true });

  // TODO: call the real system and capture fixtures with captured_at.
  const payload = {
    captured_at: new Date().toISOString(),
    scenarios: {
      success: {
        description: "Happy path",
        outputs: {
          example: { note: "TODO: capture output" }
        }
      }
    }
  };

  const outputPath = path.join(fixtureDir, "sample.json");
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(\`Wrote \${outputPath}\`);
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exitCode = 1;
});
`;

  const fixtureContents = `{
  "captured_at": "${new Date().toISOString()}",
  "scenarios": {
    "success": {
      "description": "Happy path",
      "outputs": {
        "example": { "note": "TODO: capture output" }
      }
    }
  }
}
`;

  const mockContents = `/**
 * Purpose: Mock implementation for ${seam} using fixtures.
 */
import fs from "fs";
import path from "path";
import { AppError } from "../../../contracts/store.contract.js";
import type { I${pascal} } from "../../../contracts/${seam}.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "${seam}", "sample.json");

type ScenarioFixture = {
  outputs?: Record<string, unknown>;
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

export class Mock${pascal} implements I${pascal} {
  private readonly fixture: FixtureFile;

  constructor(private scenario = "success") {
    this.fixture = loadFixture();
  }

  protected getScenario(): ScenarioFixture {
    const scenario = this.fixture.scenarios?.[this.scenario];
    if (!scenario) {
      throw new AppError("VALIDATION_FAILED", \`Unknown scenario: \${this.scenario}\`);
    }
    if (scenario.error) {
      throw new AppError("VALIDATION_FAILED", scenario.error.message);
    }
    return scenario;
  }

  // TODO: implement contract methods using fixture outputs.
}
`;

  const adapterContents = `/**
 * Purpose: Real implementation for ${seam}.
 */
import { AppError } from "../../../contracts/store.contract.js";
import type { I${pascal} } from "../../../contracts/${seam}.contract.js";

export class ${pascal}Adapter implements I${pascal} {
  // TODO: implement using real dependencies.
  private notImplemented(method: string): never {
    throw new AppError("INTERNAL_ERROR", \`${pascal}.\${method} not implemented\`);
  }
}
`;

  const testContents = `/**
 * Purpose: Verify ${seam} contract compliance.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { I${pascal} } from "../../contracts/${seam}.contract.js";
import { Mock${pascal} } from "../../src/lib/mocks/${seam}.mock.js";

export function run${pascal}ContractTests(createAdapter: () => Promise<I${pascal}>) {
  describe("${pascal} Contract", () => {
    let adapter: I${pascal};

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    it("TODO: define contract behaviors", async () => {
      assert.fail("TODO: replace with real contract expectations");
    });
  });
}

describe("Mock${pascal}", () => {
  run${pascal}ContractTests(async () => new Mock${pascal}());
});
`;

  writeFileIfMissing(contractPath, contractContents, result);
  writeFileIfMissing(probePath, probeContents, result);
  ensureDir(fixturesDir);
  writeFileIfMissing(fixturePath, fixtureContents, result);
  writeFileIfMissing(mockPath, mockContents, result);
  writeFileIfMissing(adapterPath, adapterContents, result);
  writeFileIfMissing(testPath, testContents, result);

  if (result.created.length) {
    console.log("Created:");
    for (const item of result.created) {
      console.log(`- ${path.relative(root, item)}`);
    }
  }

  if (result.skipped.length) {
    console.log("Skipped (already exists):");
    for (const item of result.skipped) {
      console.log(`- ${path.relative(root, item)}`);
    }
  }
}

main();
