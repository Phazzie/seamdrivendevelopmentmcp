import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { AuditAdapter } from "../src/lib/adapters/audit.adapter.js";
import { PathGuard } from "../src/lib/helpers/path_guard.js";
import path from "path";
import os from "os";
import fs from "fs";

const STORE_PATH = process.env.MCP_STORE_PATH || path.join(os.homedir(), ".mcp-collaboration", "store.json");
const ROOT_DIR = process.cwd();

async function main() {
  const pathGuard = new PathGuard(ROOT_DIR);
  const store = new StoreAdapter(STORE_PATH, pathGuard);
  const audit = new AuditAdapter(store);

  // ... rest of script
}