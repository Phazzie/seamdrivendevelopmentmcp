/**
 * Purpose: Capture confidence_auction seam environment info (pure logic).
 * Waiver: Confidence auction is deterministic logic; probe records runtime context.
 */
import fs from "fs";
import path from "path";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "confidence_auction");
if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

const result = {
  captured_at: new Date().toISOString(),
  os: process.platform,
  node: process.version,
  note: "Confidence auction is pure logic; fixture scenarios define expected behavior.",
};

fs.writeFileSync(
  path.join(FIXTURE_DIR, "capabilities.json"),
  JSON.stringify(result, null, 2)
);

console.log("Confidence auction probe captured runtime context.");
