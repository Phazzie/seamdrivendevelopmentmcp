/**
 * Purpose: Capture scaffolder environment data (scaffolder seam).
 */
import path from "path";
import os from "os";
import { ScaffolderAdapter } from "../src/lib/adapters/scaffolder.adapter.js";
import { JailedFs } from "../src/lib/helpers/jailed_fs.js";
import fs from "fs";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures/scaffolder");
if (!fs.existsSync(FIXTURE_DIR)) fs.mkdirSync(FIXTURE_DIR, { recursive: true });

async function run() {
  const jailedFs = new JailedFs(os.tmpdir());
  const scaffolder = new ScaffolderAdapter(jailedFs);

  const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-probe-"));

  const result = await scaffolder.scaffold({
    seamName: "probe_generated",
    baseDir: TEMP_DIR
  });

  if (!result.success) {
    console.error("Scaffold failed:", result.message);
    process.exit(1);
  }

  const timestamp = new Date().toISOString();

  // Refresh fixtures
  ["capabilities.json", "sample.json"].forEach(file => {
    const filePath = path.join(FIXTURE_DIR, file);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      data.captured_at = timestamp;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } else if (file === "capabilities.json") {
      // Create capabilities if missing
      fs.writeFileSync(filePath, JSON.stringify({
        captured_at: timestamp,
        platform: process.platform,
        node: process.version
      }, null, 2));
    }
  });

  console.log("Scaffolder probe complete.");
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

run().catch(console.error);
