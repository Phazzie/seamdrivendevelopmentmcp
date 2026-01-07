import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "audit");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const now = Date.now();
  const fixture = {
    id: randomUUID(),
    agentId: "sample-agent",
    tool: "register_agent",
    timestamp: now,
    argsSummary: "{\"name\":\"codex\"}",
    resultSummary: "{\"id\":\"sample\"}",
    captured_at: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "sample.json"),
    JSON.stringify(fixture, null, 2)
  );

  console.log("Audit sample fixture written.");
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
