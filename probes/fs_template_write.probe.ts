/**
 * Purpose: Probe filesystem capability for template writing (scaffolder seam).
 * Verifies: permissions, path creation, and overwrite behavior.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_DIR = path.join(process.cwd(), 'fixtures/scaffolder');
const TEST_FILE = path.join(FIXTURE_DIR, 'probe_test.ts');

// Ensure fixture dir exists
if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

const template = "export const hello = 'world';\n";

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
  
  // Output result fixture
  const result = {
    platform: process.platform,
    canWrite: true,
    canOverwrite: true,
    encoding: 'utf-8',
    captured_at: new Date().toISOString()
  };
  fs.writeFileSync(path.join(FIXTURE_DIR, 'capabilities.json'), JSON.stringify(result, null, 2));

} catch (err) {
  console.error("Probe failed:", err);
  process.exit(1);
}
