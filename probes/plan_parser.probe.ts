/**
 * Purpose: Capture environment Markdown samples for plan_parser (plan_parser seam).
 * Waiver: Markdown parsing is pure logic. This probe only verifies FS connectivity
 * and provides real-world samples alongside contract fixtures.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_DIR = path.join(__dirname, "../../fixtures/plan_parser");
const PLAN_FILE = path.join(__dirname, "../../MASTER_PLAN.md");

if (!fs.existsSync(FIXTURE_DIR)) fs.mkdirSync(FIXTURE_DIR, { recursive: true });

async function runProbe() {
  // Capture real Master Plan if available, otherwise use inline sample
  let sampleMarkdown = "";
  if (fs.existsSync(PLAN_FILE)) {
    sampleMarkdown = fs.readFileSync(PLAN_FILE, "utf-8");
    console.log("Captured MASTER_PLAN.md as sample.");
  } else {
    sampleMarkdown = "## Phase 1\n- [ ] Task A\n";
    console.log("MASTER_PLAN.md not found, using inline sample.");
  }

  const result = {
    captured_at: new Date().toISOString(),
    os: process.platform,
    samples: {
      master_plan: {
        markdown: sampleMarkdown,
      },
    },
  };

  fs.writeFileSync(path.join(FIXTURE_DIR, "samples.json"), JSON.stringify(result, null, 2));
  console.log("plan_parser data-capture probe complete.");
}

runProbe().catch(console.error);
