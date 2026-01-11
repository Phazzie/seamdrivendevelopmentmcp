import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "agents");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const now = Date.now();

  const fixture = {
    id: randomUUID(),
    name: "User",
    createdAt: now,
    lastSeenAt: now,
    captured_at: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "local_user.json"),
    JSON.stringify(fixture, null, 2)
  );

  console.log("Agent identity fixture written.");
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
