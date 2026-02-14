import { spawn } from "node:child_process";
import {
  IWorkerRuntime,
  WorkerModel,
  WorkerRuntimeInvocation,
  WorkerRuntimeResult,
} from "../../../contracts/worker_orchestrator.contract.js";
import { AppError } from "../../../contracts/store.contract.js";

const MAX_CAPTURE_BYTES = 256_000;

export type WorkerCommandTemplate = {
  command: string;
  staticArgs: string[];
  promptFlag?: string;
  outputFlag?: string[];
};

type ToolProfileMap = Record<WorkerModel, WorkerCommandTemplate>;

/**
 * Purpose: Isolate process execution for worker orchestration (infrastructure seam).
 * Hardened: No shell, bounded output capture, timeout kill strategy.
 */
export class WorkerRuntimeHelper implements IWorkerRuntime {
  async run(invocation: WorkerRuntimeInvocation): Promise<WorkerRuntimeResult> {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const proc = spawn(invocation.command, invocation.args, {
        cwd: invocation.cwd,
        shell: false,
        env: this.buildSanitizedEnv(),
      });

      let timedOut = false;
      let stdout = "";
      let stderr = "";

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill("SIGTERM");
        setTimeout(() => {
          if (!proc.killed) proc.kill("SIGKILL");
        }, 2000);
      }, invocation.timeoutMs);

      proc.stdout.on("data", (chunk) => {
        stdout = this.appendBounded(stdout, String(chunk));
      });
      proc.stderr.on("data", (chunk) => {
        stderr = this.appendBounded(stderr, String(chunk));
      });

      proc.on("close", (exitCode) => {
        clearTimeout(timer);
        resolve({
          exitCode,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          durationMs: Date.now() - startedAt,
          timedOut,
        });
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          exitCode: -1,
          stdout: stdout.trim(),
          stderr: err.message,
          durationMs: Date.now() - startedAt,
          timedOut,
        });
      });
    });
  }

  createInvocation(
    model: WorkerModel,
    prompt: string,
    cwd: string,
    timeoutMs: number
  ): WorkerRuntimeInvocation {
    const profile = this.getProfiles()[model];
    if (!profile) {
      throw new AppError("VALIDATION_FAILED", `Unknown worker model profile: ${model}`);
    }

    const args = [...profile.staticArgs];
    if (profile.promptFlag) {
      args.push(profile.promptFlag, prompt);
    } else {
      args.push(prompt);
    }
    if (profile.outputFlag) {
      args.push(...profile.outputFlag);
    }

    return {
      command: profile.command,
      args,
      cwd,
      timeoutMs,
    };
  }

  getProfiles(): ToolProfileMap {
    return {
      codex_cli: {
        command: process.env.MCP_CODEX_BIN || "codex",
        staticArgs: parseArgsJson(process.env.MCP_CODEX_ARGS_JSON, ["exec"]),
      },
      gemini_cli: {
        command: process.env.MCP_GEMINI_BIN || "gemini",
        staticArgs: parseArgsJson(process.env.MCP_GEMINI_ARGS_JSON, []),
        promptFlag: "-p",
        outputFlag: ["--output-format", "json"],
      },
    };
  }

  private appendBounded(current: string, incoming: string): string {
    const merged = current + incoming;
    if (Buffer.byteLength(merged, "utf-8") <= MAX_CAPTURE_BYTES) {
      return merged;
    }
    const truncated = trimToBytes(merged, MAX_CAPTURE_BYTES);
    return `${truncated}\n...[TRUNCATED]`;
  }

  private buildSanitizedEnv(): NodeJS.ProcessEnv {
    // Keep minimal inherited environment. Remove NODE_OPTIONS to prevent injected hooks.
    const { NODE_OPTIONS, ...rest } = process.env;
    return {
      ...rest,
      NODE_OPTIONS: "",
    };
  }
}

function parseArgsJson(raw: string | undefined, fallback: string[]): string[] {
  if (!raw || raw.trim().length === 0) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== "string")) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function trimToBytes(text: string, maxBytes: number): string {
  const buf = Buffer.from(text, "utf-8");
  if (buf.byteLength <= maxBytes) return text;
  return buf.subarray(0, maxBytes).toString("utf-8");
}
