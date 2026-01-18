import { randomUUID } from "crypto";
import type { 
  ITuiDataClient, 
  TuiChatMessage, 
  TuiHealthSnapshot, 
  TuiConfig 
} from "../../../contracts/tui.contract.js";
import type { IMessageBridge } from "../../../contracts/messages.contract.js";
import type { IStatusReader } from "../../../contracts/status.contract.js";
import type { ISddTracking } from "../../../contracts/sdd_tracking.contract.js";
import type { ITelemetryClient } from "../../../contracts/telemetry.contract.js";

/**
 * Purpose: Real implementation of the TUI Data Client (tui seam).
 * Hardened: Read-only, decoupled from interaction logic.
 */
export class TuiDataAdapter implements ITuiDataClient {
  constructor(
    private readonly config: TuiConfig,
    private readonly messages: IMessageBridge,
    private readonly healthProvider: () => Promise<TuiHealthSnapshot>
  ) {}

  async getChatHistory(): Promise<TuiChatMessage[]> {
    const rawMessages = await this.messages.list();
    return rawMessages.map(m => ({
      id: m.id,
      timestamp: m.timestamp,
      author: m.sender,
      content: m.content,
      pane: this.determinePane(m.sender),
      target: "broadcast",
      role: "none",
      metadata: {}
    }));
  }

  async getHealth(): Promise<TuiHealthSnapshot> {
    return this.healthProvider();
  }

  private determinePane(sender: string): "left" | "right" {
    const leftAgent = this.config.paneAgents?.left || "Gemini";
    return sender.toLowerCase().includes(leftAgent.toLowerCase()) ? "left" : "right";
  }
}

/**
 * Factory to create a health provider from underlying adapters.
 */
export function createStatusHealthProvider(
  status: IStatusReader,
  sdd: ISddTracking,
  telemetry: ITelemetryClient
): () => Promise<TuiHealthSnapshot> {
  return async () => {
    const [s, report] = await Promise.all([status.getStatus(), sdd.getReport()]);
    
    return {
      persistence: { status: "healthy", latencyMs: 0 },
      telemetry: { status: "healthy", bufferUsage: 0 },
      state: { status: s.panicMode ? "stale" : "synced", driftMs: 0 },
      command: { status: "healthy", lastResult: "success" },
      // Correction: Use overallScore and isHealthy
      compliance: { status: report.isHealthy ? "healthy" : "failed", score: report.overallScore }
    };
  };
}
