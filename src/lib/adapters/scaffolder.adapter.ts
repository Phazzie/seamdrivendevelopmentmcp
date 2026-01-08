/**
 * Purpose: Real file-system implementation of the Scaffolder (scaffolder seam).
 */
import fs from "fs";
import path from "path";
import { IScaffolder, ScaffoldInput, ScaffoldResult, GeneratedFile } from "../../../contracts/scaffolder.contract.js";

export class ScaffolderAdapter implements IScaffolder {
  async scaffold(input: ScaffoldInput): Promise<ScaffoldResult> {
    const { seamName, baseDir } = input;
    const generated: GeneratedFile[] = [];

    // Helper to write file
    const writeFile = (relPath: string, content: string, type: GeneratedFile["type"]) => {
      const fullPath = path.join(baseDir, relPath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, content.trim() + "\n");
      generated.push({ path: fullPath, type });
    };

    try {
      // 1. Contract
      writeFile(
        `contracts/${seamName}.contract.ts`,
        `/**
 * Purpose: Define contract for ${seamName} (seam: ${seamName}).
 */
import { z } from "zod";

export const ${toPascalCase(seamName)}Schema = z.object({
  id: z.string().uuid(),
  // TODO: Add fields
});
export type ${toPascalCase(seamName)} = z.infer<typeof ${toPascalCase(seamName)}Schema>;

export interface I${toPascalCase(seamName)} {
  // TODO: Add methods
}
`,
        "contract"
      );

      // 2. Probe
      writeFile(
        `probes/${seamName}.probe.ts`,
        `/**
 * Purpose: Probe external reality for ${seamName}.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_DIR = path.join(__dirname, '../../fixtures/${seamName}');

if (!fs.existsSync(FIXTURE_DIR)) fs.mkdirSync(FIXTURE_DIR, { recursive: true });

async function runProbe() {
  // TODO: Implement probe logic
  const result = { capturedAt: Date.now() };
  
  fs.writeFileSync(path.join(FIXTURE_DIR, 'default.json'), JSON.stringify(result, null, 2));
  console.log('${seamName} probe complete.');
}

runProbe().catch(console.error);
`,
        "probe"
      );

      // 3. Fixture (Empty placeholder)
      writeFile(
        `fixtures/${seamName}/default.json`,
        `{
  "capturedAt": 0,
  "note": "Run the probe to populate this file."
}`,
        "fixture"
      );

      // 4. Mock
      writeFile(
        `src/lib/mocks/${seamName}.mock.ts`,
        `/**
 * Purpose: Mock implementation for ${seamName} using fixtures.
 */
import { I${toPascalCase(seamName)} } from "../../../contracts/${seamName}.contract.js";

export class Mock${toPascalCase(seamName)} implements I${toPascalCase(seamName)} {
  constructor(private fixturePath: string) {}
  
  // TODO: Implement interface
}
`,
        "mock"
      );

      // 5. Test
      writeFile(
        `tests/contract/${seamName}.test.ts`,
        `/**
 * Purpose: Verify ${seamName} contract compliance.
 */
import test from "node:test";
import assert from "node:assert";
import { Mock${toPascalCase(seamName)} } from "../../src/lib/mocks/${seamName}.mock.js";

test("${toPascalCase(seamName)} Contract - Basic", async () => {
  const mock = new Mock${toPascalCase(seamName)}("fixtures/${seamName}/default.json");
  // TODO: Assert behavior
  assert.ok(true);
});
`,
        "test"
      );

      // 6. Adapter (Real)
      writeFile(
        `src/lib/adapters/${seamName}.adapter.ts`,
        `/**
 * Purpose: Real implementation for ${seamName}.
 */
import { I${toPascalCase(seamName)} } from "../../../contracts/${seamName}.contract.js";

export class ${toPascalCase(seamName)}Adapter implements I${toPascalCase(seamName)} {
  // TODO: Implement real logic
}
`,
        "adapter"
      );

      return { success: true, files: generated };

    } catch (err: any) {
      return { success: false, files: generated, message: err.message };
    }
  }
}

function toPascalCase(str: string): string {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}
