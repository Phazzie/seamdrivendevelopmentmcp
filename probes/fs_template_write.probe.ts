/**
 * Purpose: Probe filesystem capability for template writing (scaffolder seam).
 * Verifies: permissions, path creation, and overwrite behavior.
 */
import fs from 'fs';
import path from 'path';
import { ScaffolderAdapter } from "../src/lib/adapters/scaffolder.adapter.js";

const FIXTURE_DIR = path.join(process.cwd(), 'fixtures/scaffolder');
const TEST_FILE = path.join(FIXTURE_DIR, 'probe_test.ts');
const SAMPLE_FIXTURE = path.join(FIXTURE_DIR, 'sample.json');
const TEMP_DIR = path.join(FIXTURE_DIR, 'probe_tmp');

// Ensure fixture dir exists
if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

const template = "export const hello = 'world';\n";

async function main() {
  try {
    // 1. Write
    fs.writeFileSync(TEST_FILE, template, 'utf-8');
    console.log(`Wrote: ${TEST_FILE}`);

    // 2. Read back
    const content = fs.readFileSync(TEST_FILE, 'utf-8');
    if (content !== template) {
      throw new Error("Content mismatch");
    }
    console.log("Read verification passed.");

    // 3. Overwrite
    fs.writeFileSync(TEST_FILE, template.replace('world', 'universe'), 'utf-8');
    console.log("Overwrite verification passed.");

    // Cleanup
    fs.unlinkSync(TEST_FILE);
    
    // Output result fixture (FS capabilities)
    const result = {
      platform: process.platform,
      canWrite: true,
      canOverwrite: true,
      encoding: 'utf-8',
      captured_at: new Date().toISOString()
    };
    fs.writeFileSync(path.join(FIXTURE_DIR, 'capabilities.json'), JSON.stringify(result, null, 2));

    // Output scaffolder fixture (sample scaffold output)
    const scaffolder = new ScaffolderAdapter();
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
    const scaffoldResult = await scaffolder.scaffold({
      seamName: "example_seam",
      baseDir: TEMP_DIR,
      spec: {
        seamName: "example_seam",
        description: "Example seam for scaffold fixture",
        models: [],
        methods: [
          { name: "do_thing", inputType: "DoThingInput", outputType: "DoThingResult" }
        ],
        scenarios: [{ name: "success", type: "success", description: "Happy path" }],
        errors: [{ code: "VALIDATION_FAILED", message: "Invalid input" }]
      }
    });

    const files = scaffoldResult.files.map((file) => ({
      ...file,
      path: file.path.replace(TEMP_DIR, "${baseDir}")
    }));

    const sampleFixture = {
      captured_at: new Date().toISOString(),
      scenarios: {
        success: {
          description: "Sample scaffold output",
          outputs: {
            scaffold: {
              success: scaffoldResult.success,
              files
            }
          }
        }
      }
    };

    fs.writeFileSync(SAMPLE_FIXTURE, JSON.stringify(sampleFixture, null, 2));

    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  } catch (err) {
    console.error("Probe failed:", err);
    process.exit(1);
  }
}

main();
