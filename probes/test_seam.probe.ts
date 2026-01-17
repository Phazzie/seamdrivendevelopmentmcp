import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, "../../fixtures/test_seam/sample.json");

async function run() {
  const fixture = { captured_at: new Date().toISOString(), scenarios: { success: { outputs: { example: "val" } } } };
  fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
  console.log("Probe complete");
}
run().catch(console.error);
