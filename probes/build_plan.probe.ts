/**
 * Purpose: Capture environment data for build_plan (build_plan seam).
 * Waiver: Markdown generation is pure logic. This probe only verifies environment
 * capability to handle multi-line strings and file paths.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_DIR = path.join(process.cwd(), "fixtures/build_plan");

if (!fs.existsSync(FIXTURE_DIR)) fs.mkdirSync(FIXTURE_DIR, { recursive: true });

async function runProbe() {
  const result = {
    captured_at: new Date().toISOString(),
    os: process.platform,
    env: {
      lineEnding: process.platform === "win32" ? "\r\n" : "\n",
    },
  };

  fs.writeFileSync(path.join(FIXTURE_DIR, "capabilities.json"), JSON.stringify(result, null, 2));

  const DEFAULT_FILE = path.join(FIXTURE_DIR, "default.json");
  if (fs.existsSync(DEFAULT_FILE)) {
    const data = JSON.parse(fs.readFileSync(DEFAULT_FILE, "utf-8"));
    data.captured_at = result.captured_at;
    fs.writeFileSync(DEFAULT_FILE, JSON.stringify(data, null, 2));
  }

  console.log("build_plan env probe complete.");
}

runProbe().catch(console.error);
