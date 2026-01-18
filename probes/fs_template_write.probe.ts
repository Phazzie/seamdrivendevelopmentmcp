import path from "path";
import os from "os";
import { ScaffolderAdapter } from "../src/lib/adapters/scaffolder.adapter.js";
import { JailedFs } from "../src/lib/helpers/jailed_fs.js";
import fs from "fs";

const ROOT_DIR = process.cwd();
const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-probe-"));

async function run() {
  const jailedFs = new JailedFs(os.tmpdir());
  const scaffolder = new ScaffolderAdapter(jailedFs);

  const result = await scaffolder.scaffold({
    seamName: "probe_generated",
    baseDir: TEMP_DIR
  });

  if (!result.success) {
    console.error("Scaffold failed:", result.message);
    process.exit(1);
  }

  console.log("Scaffold probe complete.");
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

run().catch(console.error);