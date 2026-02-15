import { GoogleGenAI } from "@google/genai";
import {
  IWorkerRuntime,
  WorkerModel,
  WorkerRuntimeMode,
  WorkerRuntimeInvocation,
  WorkerRuntimeResult,
} from "../../../contracts/worker_orchestrator.contract.js";

/**
 * Purpose: Google GenAI SDK-backed runtime for worker orchestration.
 * Hardened: bounded timeout handling and normalized non-throwing result shape.
 */
export class WorkerRuntimeGoogleSdkHelper implements IWorkerRuntime {
  readonly mode: WorkerRuntimeMode = "google_sdk";

  createInvocation(
    model: WorkerModel,
    prompt: string,
    cwd: string,
    timeoutMs: number
  ): WorkerRuntimeInvocation {
    const runtimeModel = this.resolveModel(model);
    return {
      command: "google.genai.models.generateContent",
      args: [`model=${runtimeModel}`],
      cwd,
      timeoutMs,
      prompt,
      workerModel: model,
      runtimeModel,
    };
  }

  resolveModel(model: WorkerModel): string {
    if (model === "codex_cli") {
      return process.env.MCP_GOOGLE_CODEX_MODEL || process.env.MCP_GOOGLE_MODEL || "gemini-2.5-pro";
    }
    return process.env.MCP_GOOGLE_REVIEW_MODEL || process.env.MCP_GOOGLE_MODEL || "gemini-2.5-flash";
  }

  async run(invocation: WorkerRuntimeInvocation): Promise<WorkerRuntimeResult> {
    const startedAt = Date.now();
    const apiKey = process.env.MCP_GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        exitCode: 2,
        stdout: "",
        stderr: "Google API key missing. Set MCP_GOOGLE_API_KEY or GEMINI_API_KEY.",
        durationMs: Date.now() - startedAt,
        timedOut: false,
      };
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await this.withTimeout(
        ai.models.generateContent({
          model: invocation.runtimeModel,
          contents: invocation.prompt,
        }),
        invocation.timeoutMs
      );

      return {
        exitCode: 0,
        stdout: (response.text || "").trim(),
        stderr: "",
        durationMs: Date.now() - startedAt,
        timedOut: false,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const timedOut = /timeout|timed out/i.test(message);
      return {
        exitCode: -1,
        stdout: "",
        stderr: message,
        durationMs: Date.now() - startedAt,
        timedOut,
      };
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
