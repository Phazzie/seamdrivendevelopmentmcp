#!/usr/bin/env node
// Purpose: Cockpit CLI entrypoint (tui seam).
import fs from "fs";
import path from "path";
import os from "os";
import { StoreAdapter } from "../lib/adapters/store.adapter.js";
import { MessageAdapter } from "../lib/adapters/messages.adapter.js";
import { StatusAdapter } from "../lib/adapters/status.adapter.js";
import { TelemetryAdapter } from "../lib/adapters/telemetry.adapter.js";
import { TuiConfigSchema, type TuiConfig } from "../../contracts/tui.contract.js";
import { TuiDataAdapter, createStatusHealthProvider } from "./adapters/tui.adapter.js";
import { startCockpitUi } from "./ui/cockpit.js";

type RuntimeConfig = {
  configPath?: string;
  storePath?: string;
  refreshIntervalMs?: number;
  leftLogPath?: string;
  rightLogPath?: string;
  paneAgents?: Partial<TuiConfig["paneAgents"]>;
  leaderPane?: TuiConfig["leaderPane"];
  defaultTarget?: TuiConfig["defaultTarget"];
  broadcastHeader?: string;
  enforceLeaderWait?: boolean;
};

const DEFAULT_STORE_PATH = path.join(os.homedir(), ".mcp-collaboration", "store.json");

function parseArgs(argv: string[]): RuntimeConfig {
  const config: RuntimeConfig = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const [rawKey, inlineValue] = arg.slice(2).split("=");
    const key = rawKey.trim();
    const value = inlineValue ?? argv[i + 1];
    if (!inlineValue && value && !value.startsWith("--")) {
      i += 1;
    }

    switch (key) {
      case "config":
        config.configPath = value;
        break;
      case "store":
        config.storePath = value;
        break;
      case "refresh": {
        const parsed = value ? Number(value) : undefined;
        if (parsed && Number.isFinite(parsed)) {
          config.refreshIntervalMs = parsed;
        }
        break;
      }
      case "left-agent":
        config.paneAgents = { ...config.paneAgents, left: value };
        break;
      case "right-agent":
        config.paneAgents = { ...config.paneAgents, right: value };
        break;
      case "left-log":
        config.leftLogPath = value;
        break;
      case "right-log":
        config.rightLogPath = value;
        break;
      case "leader-pane":
        config.leaderPane = value as RuntimeConfig["leaderPane"];
        break;
      case "default-target":
        config.defaultTarget = value as RuntimeConfig["defaultTarget"];
        break;
      case "broadcast-header":
        config.broadcastHeader = value;
        break;
      case "enforce-leader-wait":
        config.enforceLeaderWait = value ? value === "true" : true;
        break;
      case "help":
        printHelp();
        process.exit(0);
      default:
        break;
    }
  }
  return config;
}

function loadConfig(configPath?: string): RuntimeConfig {
  if (!configPath) return {};
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as RuntimeConfig;
  return parsed ?? {};
}

function resolveConfig(argv: RuntimeConfig, fileConfig: RuntimeConfig): {
  storePath: string;
  refreshIntervalMs?: number;
  logPaths: { left?: string; right?: string };
  tuiConfig: TuiConfig;
} {
  const storePath =
    argv.storePath || fileConfig.storePath || process.env.MCP_STORE_PATH || DEFAULT_STORE_PATH;
  const refreshIntervalMs = argv.refreshIntervalMs ?? fileConfig.refreshIntervalMs;
  const logPaths = {
    left: argv.leftLogPath ?? fileConfig.leftLogPath,
    right: argv.rightLogPath ?? fileConfig.rightLogPath,
  };

  const paneAgents = {
    left: argv.paneAgents?.left ?? fileConfig.paneAgents?.left,
    right: argv.paneAgents?.right ?? fileConfig.paneAgents?.right,
  };

  const tuiConfig = TuiConfigSchema.parse({
    paneAgents,
    leaderPane: argv.leaderPane ?? fileConfig.leaderPane,
    defaultTarget: argv.defaultTarget ?? fileConfig.defaultTarget,
    broadcastHeader: argv.broadcastHeader ?? fileConfig.broadcastHeader,
    enforceLeaderWait: argv.enforceLeaderWait ?? fileConfig.enforceLeaderWait,
  });

  return { storePath, refreshIntervalMs, logPaths, tuiConfig };
}

function ensureStoreDir(storePath: string): void {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function printHelp(): void {
  console.log(`Mission Control Cockpit

Usage:
  node dist/src/tui/index.js [options]

Options:
  --config <path>           JSON config file path
  --store <path>            Store path (default: ~/.mcp-collaboration/store.json)
  --refresh <ms>            Refresh interval in ms
  --left-agent <name>       Left pane agent label
  --right-agent <name>      Right pane agent label
  --left-log <path>         Left pane log file path
  --right-log <path>        Right pane log file path
  --leader-pane <left|right>
  --default-target <left|right|broadcast>
  --broadcast-header <text>
  --enforce-leader-wait <true|false>
  --help
`);
}

async function main(): Promise<void> {
  const argv = parseArgs(process.argv.slice(2));
  const fileConfig = loadConfig(argv.configPath);
  const { storePath, refreshIntervalMs, logPaths, tuiConfig } = resolveConfig(argv, fileConfig);

  ensureStoreDir(storePath);

  const store = new StoreAdapter(storePath);
  const messageBridge = new MessageAdapter(store);
  const statusReader = new StatusAdapter(store);
  const telemetry = new TelemetryAdapter();
  const healthProvider = createStatusHealthProvider(statusReader, telemetry);
  const client = new TuiDataAdapter(tuiConfig, messageBridge, healthProvider);

  const telemetrySources = [
    logPaths.left ? { id: tuiConfig.paneAgents.left, filePath: logPaths.left, pane: "left" as const } : null,
    logPaths.right ? { id: tuiConfig.paneAgents.right, filePath: logPaths.right, pane: "right" as const } : null,
  ].filter((entry): entry is { id: string; filePath: string; pane: "left" | "right" } => Boolean(entry));

  await startCockpitUi(client, tuiConfig, {
    refreshIntervalMs,
    telemetry: telemetrySources.length ? { client: telemetry, sources: telemetrySources } : undefined,
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`TUI startup failed: ${message}`);
  process.exit(1);
});
