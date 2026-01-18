#!/usr/bin/env node
/**
 * Purpose: MCP Server Entrypoint (V1.1.2 Liquid).
 * Hardened: Pure bootstrap logic. No wiring allowed here.
 */
import { ServerBootstrap } from "./lib/helpers/server_bootstrap.js";

async function main() {
  const app = new ServerBootstrap();
  await app.start();
}

main().catch((err) => {
  console.error("Fatal Bootstrap Error:", err);
  process.exit(1);
});