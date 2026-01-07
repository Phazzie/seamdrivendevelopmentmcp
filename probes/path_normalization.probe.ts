import fs from 'fs';
import path from 'path';

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "locker");
const PROBE_FILE = path.join(FIXTURE_DIR, 'Probe_Case_Test.txt');

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

console.log("Running Path Normalization Probe...");

try {
  // 1. Create file with Mixed Case
  fs.writeFileSync(PROBE_FILE, "test");
  
  // 2. Check if we can access it via Lower Case
  const lowerPath = PROBE_FILE.toLowerCase();
  const existsLower = fs.existsSync(lowerPath);
  
  console.log(`Created: ${PROBE_FILE}`);
  console.log(`Access Lower (${lowerPath}): ${existsLower}`);

  // 3. Check Realpath
  const realPath = fs.realpathSync(lowerPath);
  console.log(`Realpath: ${realPath}`);

  const isCaseInsensitive = existsLower && (realPath !== lowerPath || path.basename(realPath) === 'Probe_Case_Test.txt');

  const fixture = {
    platform: process.platform,
    fs_case_insensitive: isCaseInsensitive,
    normalization_strategy: isCaseInsensitive ? "lowercase" : "none",
    captured_at: new Date().toISOString()
  };

  fs.writeFileSync(path.join(FIXTURE_DIR, 'capabilities.json'), JSON.stringify(fixture, null, 2));
  console.log("Fixture saved.");

} catch (err) {
  console.error("PROBE FAILED:", err);
} finally {
  if (fs.existsSync(PROBE_FILE)) fs.unlinkSync(PROBE_FILE);
}
