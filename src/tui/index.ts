#!/usr/bin/env node
// Purpose: Cockpit CLI entrypoint (tui seam).
// Hardened: Event-driven log stream using revision pulse.
import fs from "fs";
import path from "path";
import os from "os";
import { StoreAdapter } from "../lib/adapters/store.adapter.js";
import { MessageAdapter } from "../lib/adapters/messages.adapter.js";
import { StatusAdapter } from "../lib/adapters/status.adapter.js";
import { TelemetryAdapter } from "../lib/adapters/telemetry.adapter.js";
import { SddTrackingAdapter } from "../lib/adapters/sdd_tracking.adapter.js";
import { PathGuard } from "../lib/helpers/path_guard.js";
import { JailedFs } from "../lib/helpers/jailed_fs.js";
import { createRevisionStream } from "../lib/helpers/revision_stream.js";
import { TuiConfigSchema } from "../../contracts/tui.contract.js";
import { TuiDataAdapter, createStatusHealthProvider } from "./adapters/tui.adapter.js";
import { startCockpitUi } from "./ui/cockpit.js";

const DEFAULT_STORE_PATH = path.join(os.homedir(), ".mcp-collaboration", "store.json");

async function main(): Promise<void> {
  const storePath = process.env.MCP_STORE_PATH || DEFAULT_STORE_PATH;
  const rootDir = process.cwd();
  const pathGuard = new PathGuard(rootDir);
  const jailedFs = new JailedFs(rootDir);

  // Core Pulse
  const store = new StoreAdapter(storePath, jailedFs);
  const revisionStream = createRevisionStream(store);

  // Adapters
  const messageBridge = new MessageAdapter(store);
  const statusReader = new StatusAdapter(store);
  const telemetry = new TelemetryAdapter();
  const sddTracking = new SddTrackingAdapter(rootDir);

  // TUI Wiring
  const config = TuiConfigSchema.parse({}); // Use defaults
  const healthProvider = createStatusHealthProvider(statusReader, sddTracking, telemetry);
  const client = new TuiDataAdapter(config, messageBridge, healthProvider);

  console.error(`[TUI] Monitoring Store: ${storePath}`);

  await startCockpitUi(client, config, {
    revisionStream,
    telemetry: { 
      client: telemetry, 
      sources: [] // Add sources if needed from ENV
    },
  });
}

main().catch((error) => {
  console.error(`TUI startup failed: ${error.message}`);
  process.exit(1);
});