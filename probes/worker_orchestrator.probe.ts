// Purpose: Probe headless worker CLI availability and version capture (seam: worker_orchestrator)
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type ProbeResult = {
  captured_at: string;
  env: {
    platform: string;
    node_version: string;
  };
  tools: {
    codex_cli: {
      available: boolean;
      command: string;
      version: string | null;
      error: string | null;
    };
    gemini_cli: {
      available: boolean;
      command: string;
      version: string | null;
      error: string | null;
    };
  };
};

function probeCommand(command: string): { available: boolean; version: string | null; error: string | null } {
  const res = spawnSync(command, ["--version"], {
    encoding: "utf-8",
    shell: false,
    timeout: 5000,
  });

  if (res.error) {
    return { available: false, version: null, error: res.error.message };
  }

  if (res.status !== 0) {
    const err = (res.stderr || res.stdout || "").trim() || `Exit ${res.status}`;
    return { available: false, version: null, error: err };
  }

  return {
    available: true,
    version: (res.stdout || res.stderr || "").trim() || null,
    error: null,
  };
}

function main() {
  const codexCmd = process.env.MCP_CODEX_BIN || "codex";
  const geminiCmd = process.env.MCP_GEMINI_BIN || "gemini";

  const codex = probeCommand(codexCmd);
  const gemini = probeCommand(geminiCmd);

  const result: ProbeResult = {
    captured_at: new Date().toISOString(),
    env: {
      platform: process.platform,
      node_version: process.version,
    },
    tools: {
      codex_cli: {
        available: codex.available,
        command: codexCmd,
        version: codex.version,
        error: codex.error,
      },
      gemini_cli: {
        available: gemini.available,
        command: geminiCmd,
        version: gemini.version,
        error: gemini.error,
      },
    },
  };

  const fixtureDir = join(process.cwd(), "fixtures", "worker_orchestrator");
  mkdirSync(fixtureDir, { recursive: true });
  writeFileSync(join(fixtureDir, "capability.json"), JSON.stringify(result, null, 2));

  console.log(JSON.stringify(result, null, 2));
}

main();
