import OpenAI from "openai";
import {
  IWorkerRuntime,
  WorkerModel,
  WorkerRuntimeMode,
  WorkerRuntimeInvocation,
  WorkerRuntimeResult,
} from "../../../contracts/worker_orchestrator.contract.js";

/**
 * Purpose: OpenAI SDK-backed runtime for worker orchestration.
 * Hardened: returns normalized results and never executes shell commands.
 */
export class WorkerRuntimeOpenAiSdkHelper implements IWorkerRuntime {
  readonly mode: WorkerRuntimeMode = "openai_sdk";

  createInvocation(
    model: WorkerModel,
    prompt: string,
    cwd: string,
    timeoutMs: number
  ): WorkerRuntimeInvocation {
    const runtimeModel = this.resolveModel(model);
    return {
      command: "openai.responses.create",
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
      return process.env.MCP_OPENAI_CODEX_MODEL || process.env.MCP_OPENAI_MODEL || "gpt-5.2-codex";
    }
    return process.env.MCP_OPENAI_REVIEW_MODEL || process.env.MCP_OPENAI_MODEL || "gpt-5.2";
  }

  async run(invocation: WorkerRuntimeInvocation): Promise<WorkerRuntimeResult> {
    const startedAt = Date.now();
    const apiKey = process.env.MCP_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        exitCode: 2,
        stdout: "",
        stderr: "OpenAI API key missing. Set MCP_OPENAI_API_KEY or OPENAI_API_KEY.",
        durationMs: Date.now() - startedAt,
        timedOut: false,
      };
    }

    try {
      const client = new OpenAI({
        apiKey,
        timeout: invocation.timeoutMs,
        maxRetries: 0,
      });

      const response = await client.responses.create({
        model: invocation.runtimeModel,
        input: invocation.prompt,
      });

      return {
        exitCode: 0,
        stdout: (response.output_text || "").trim(),
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
}
