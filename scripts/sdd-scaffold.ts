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
  const mockPath = path.join(root, "src", "lib", "mocks", `${seam}.mock.ts`);
  const adapterPath = path.join(root, "src", "lib", "adapters", `${seam}.adapter.ts`);
  const testPath = path.join(root, "tests", "contract", `${seam}.test.ts`);

  const contractContents = `import { z } from "zod";

// TODO: replace schema and interface with real contract.
export const ${pascal}Schema = z.object({});
export type ${pascal} = z.infer<typeof ${pascal}Schema>;

export interface I${pascal}Adapter {
  // TODO: define contract methods.
}
`;

  const probeContents = `import fs from "fs";
import path from "path";

async function main(): Promise<void> {
  const fixtureDir = path.join(process.cwd(), "fixtures", "${seam}");
  fs.mkdirSync(fixtureDir, { recursive: true });

  // TODO: call the real system and capture fixtures with captured_at.
  const payload = {
    captured_at: new Date().toISOString(),
    scenario: "success",
    data: {}
  };

  const outputPath = path.join(fixtureDir, "success.json");
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(\`Wrote \${outputPath}\`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
`;

  const mockContents = `import type { I${pascal}Adapter } from "../../../contracts/${seam}.contract.js";

export class Mock${pascal}Adapter implements I${pascal}Adapter {
  // TODO: load fixtures by scenario and implement contract methods.
}
`;

  const adapterContents = `import type { I${pascal}Adapter } from "../../../contracts/${seam}.contract.js";

export class ${pascal}Adapter implements I${pascal}Adapter {
  // TODO: implement using real dependencies.
}
`;

  const testContents = `import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { I${pascal}Adapter } from "../../contracts/${seam}.contract.js";
import { Mock${pascal}Adapter } from "../../src/lib/mocks/${seam}.mock.js";

export function run${pascal}ContractTests(createAdapter: () => Promise<I${pascal}Adapter>) {
  describe("${pascal} Contract", () => {
    let adapter: I${pascal}Adapter;

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    it("TODO: define contract behaviors", async () => {
      assert.fail("TODO: replace with real contract expectations");
    });
  });
}

describe("Mock${pascal}Adapter", () => {
  run${pascal}ContractTests(async () => new Mock${pascal}Adapter());
});
`;

  writeFileIfMissing(contractPath, contractContents, result);
  writeFileIfMissing(probePath, probeContents, result);
  ensureDir(fixturesDir);
  writeFileIfMissing(path.join(fixturesDir, ".gitkeep"), "", result);
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
