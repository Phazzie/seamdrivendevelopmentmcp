import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// Use the project root fixtures directory
const FIXTURE_DIR = path.join(process.cwd(), 'fixtures/store');
const PROBE_FILE = path.join(FIXTURE_DIR, 'probe_atomic.json');
const TEMP_FILE = path.join(FIXTURE_DIR, `probe_temp_${randomUUID()}.json`);

// Ensure directory exists
if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

console.log("Running FS Atomic Probe...");

try {
  // 1. Setup initial state
  fs.writeFileSync(PROBE_FILE, JSON.stringify({ version: 1 }));
  const initialStat = fs.statSync(PROBE_FILE);
  console.log(`[1] Initial file created. Inode: ${initialStat.ino}`);

  // 2. Write temp file
  fs.writeFileSync(TEMP_FILE, JSON.stringify({ version: 2 }));
  console.log(`[2] Temp file created.`);
  
  // 3. Fsync temp file (simulating durability)
  const fd = fs.openSync(TEMP_FILE, 'r+');
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  console.log(`[3] Temp file fsync'd.`);

  // 4. Atomic Rename
  fs.renameSync(TEMP_FILE, PROBE_FILE);
  const newStat = fs.statSync(PROBE_FILE);
  console.log(`[4] Rename complete. New Inode: ${newStat.ino}`);

  // 5. Verification
  if (initialStat.ino === newStat.ino) {
    console.error("FAIL: Inode did not change! This was an in-place write, not an atomic replacement.");
    process.exit(1);
  } else {
    console.log("SUCCESS: Inode changed. Atomic replacement verified.");
    
    // Save fixture for the Mock
    const fixture = {
      platform: process.platform,
      atomic_strategy: "rename",
      fsync_supported: true,
      captured_at: new Date().toISOString()
    };
    fs.writeFileSync(path.join(FIXTURE_DIR, 'capabilities.json'), JSON.stringify(fixture, null, 2));
    console.log("Fixture saved to fixtures/store/capabilities.json");
  }

} catch (err) {
  console.error("PROBE FAILED:", err);
  process.exit(1);
} finally {
  // Cleanup
  if (fs.existsSync(PROBE_FILE)) fs.unlinkSync(PROBE_FILE);
  if (fs.existsSync(TEMP_FILE)) fs.unlinkSync(TEMP_FILE);
}
