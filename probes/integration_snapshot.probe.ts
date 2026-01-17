// Purpose: capture an integration snapshot fixture from the live store.
import fs from "fs/promises";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { IntegrationSnapshotSchema } from "../contracts/integration_snapshot.contract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_DIR = path.join(__dirname, "../fixtures/integration_snapshot");

const STORE_PATH =
  process.env.MCP_STORE_PATH ||
  path.join(os.homedir(), ".mcp-collaboration", "store.json");

async function main() {
  await fs.mkdir(FIXTURE_DIR, { recursive: true });

  const store = new StoreAdapter(STORE_PATH);
  const data = await store.load();

  const snapshot = {
    captured_at: new Date().toISOString(),
    store_path: STORE_PATH,
    store: data,
  };

  const parsed = IntegrationSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) {
    console.error("Fixture failed schema validation:", parsed.error);
    process.exit(1);
  }

  await fs.writeFile(
    path.join(FIXTURE_DIR, "snapshot.json"),
    JSON.stringify(parsed.data, null, 2)
  );

  console.log("Integration snapshot fixture written.");
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});