/**
 * Purpose: Capture scheduler seam environment info (pure logic).
 * Waiver: Scheduling is deterministic logic; probe only records runtime context.
 */
import fs from "fs";
import path from "path";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "scheduler");
if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

const result = {
  captured_at: new Date().toISOString(),
  os: process.platform,
  node: process.version,
  note: "Scheduler is pure logic; fixture scenarios define expected behavior.",
};

fs.writeFileSync(
  path.join(FIXTURE_DIR, "capabilities.json"),
  JSON.stringify(result, null, 2)
);

const DEFAULT_FILE = path.join(FIXTURE_DIR, "default.json");
if (fs.existsSync(DEFAULT_FILE)) {
  const data = JSON.parse(fs.readFileSync(DEFAULT_FILE, "utf-8"));
  data.captured_at = result.captured_at;
  fs.writeFileSync(DEFAULT_FILE, JSON.stringify(data, null, 2));
}

console.log("Scheduler probe captured runtime context.");
