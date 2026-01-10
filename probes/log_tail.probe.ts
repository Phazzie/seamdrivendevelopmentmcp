/**
 * Purpose: Probe FS behavior for log tailing on macOS (telemetry seam).
 * Verifies:
 * 1. fs.watch behavior on append.
 * 2. Latency of updates.
 * 3. Handling of file rotation (rename/create).
 */
import * as fs from 'fs';
import * as path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(process.cwd(), 'fixtures/telemetry/probe.log');
const FIXTURE_OUT = path.join(process.cwd(), 'fixtures/telemetry/fs_watch.json');

// Ensure directory exists
const dir = path.dirname(LOG_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const results: any = {
  platform: process.platform,
  events: [],
  timings: [],
  captured_at: new Date().toISOString()
};

// Reset log file
fs.writeFileSync(LOG_FILE, 'INIT\n');

console.log(`Watching ${LOG_FILE}...`);

// Start Watcher
const start = Date.now();
const watcher = fs.watch(LOG_FILE, (eventType, filename) => {
  const now = Date.now();
  results.events.push({ eventType, filename, latency: now - start });
  console.log(`Event: ${eventType} on ${filename}`);
});

// Simulate Activity
async function runSequence() {
  // 1. Append
  await new Promise(r => setTimeout(r, 100));
  fs.appendFileSync(LOG_FILE, 'LINE 1\n');
  
  // 2. Rapid Append
  await new Promise(r => setTimeout(r, 50));
  fs.appendFileSync(LOG_FILE, 'LINE 2\n');
  fs.appendFileSync(LOG_FILE, 'LINE 3\n');

  // 3. Rotation (Simulated)
  await new Promise(r => setTimeout(r, 100));
  const rotatedPath = `${LOG_FILE}.1`;
  fs.renameSync(LOG_FILE, rotatedPath); // Rename
  fs.writeFileSync(LOG_FILE, 'NEW LOG START\n'); // Re-create

  // Wait for events to settle
  await new Promise(r => setTimeout(r, 500));
  
  watcher.close();
  
  // Cleanup
  if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
  if (fs.existsSync(rotatedPath)) fs.unlinkSync(rotatedPath);

  // Write Fixture
  fs.writeFileSync(FIXTURE_OUT, JSON.stringify(results, null, 2));
  console.log('Telemetry probe complete.');
}

runSequence().catch(err => console.error(err));
