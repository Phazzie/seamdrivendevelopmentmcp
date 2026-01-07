// Purpose: adapt existing message/status seams into the TUI cockpit contract (tui seam).
import type { IMessageBridge, Message } from "../../../contracts/messages.contract.js";
import type { IStatusReader } from "../../../contracts/status.contract.js";
import type { ITelemetryClient } from "../../../contracts/telemetry.contract.js";
import type {
  ITuiDataClient,
  TuiChatMessage,
  TuiCommand,
  TuiCommandResult,
  TuiConfig,
  TuiError,
  TuiHealthSnapshot,
  TuiPane,
  TuiRole,
  TuiTarget,
} from "../../../contracts/tui.contract.js";
import {
  AppErrorCodeSchema,
} from "../../../contracts/store.contract.js";
import { TuiPaneSchema, TuiRoleSchema, TuiTargetSchema } from "../../../contracts/tui.contract.js";

const DEFAULT_MESSAGE_LIMIT = 200;
const STALE_THRESHOLD_MS = 15000;
const DEGRADE_LATENCY_MS = 500;
const FAIL_LATENCY_MS = 2000;
const TELEMETRY_DEGRADED_AT = 80;
const DEFAULT_TELEMETRY_SOURCE = "tui";

type HealthProvider = () => Promise<TuiHealthSnapshot>;

export function createStatusHealthProvider(
  statusReader: IStatusReader,
  telemetryClient?: ITelemetryClient,
  telemetrySourceId: string = DEFAULT_TELEMETRY_SOURCE
): HealthProvider {
  let lastRevision = 0;
  let lastRevisionAt = Date.now();

  return async () => {
    const startedAt = Date.now();
    const status = await statusReader.getStatus();
    const latencyMs = Date.now() - startedAt;

    if (status.revision !== lastRevision) {
      lastRevision = status.revision;
      lastRevisionAt = Date.now();
    }

    const driftMs = Date.now() - lastRevisionAt;
    let bufferUsage = Math.min(100, status.messageCount);
    if (telemetryClient) {
      try {
        const buffer = await telemetryClient.getBufferStatus(telemetrySourceId);
        bufferUsage = buffer.usagePercent;
      } catch {
        bufferUsage = Math.min(100, status.messageCount);
      }
    }
    const persistenceStatus =
      latencyMs >= FAIL_LATENCY_MS
        ? "failed"
        : latencyMs >= DEGRADE_LATENCY_MS
          ? "degraded"
          : "healthy";
    const telemetryStatus = bufferUsage >= TELEMETRY_DEGRADED_AT ? "degraded" : "healthy";
    const stateStatus = driftMs >= STALE_THRESHOLD_MS ? "stale" : "synced";
    const commandStatus: TuiHealthSnapshot["command"] = status.panicMode
      ? { status: "failed", lastResult: "error", lastError: "PANIC_MODE" }
      : { status: "healthy", lastResult: "success" };

    return {
      persistence: { status: persistenceStatus, latencyMs },
      telemetry: { status: telemetryStatus, bufferUsage },
      state: { status: stateStatus, driftMs },
      command: commandStatus,
    };
  };
}

export class TuiDataAdapter implements ITuiDataClient {
  private lastCommand: TuiHealthSnapshot["command"] | null = null;
  private readonly messageLimit: number;
  private currentTarget: TuiTarget;
  private leaderPane: TuiPane;

  constructor(
    private readonly config: TuiConfig,
    private readonly messageBridge: IMessageBridge,
    private readonly healthProvider: HealthProvider,
    messageLimit: number = DEFAULT_MESSAGE_LIMIT
  ) {
    this.messageLimit = messageLimit;
    this.currentTarget = config.defaultTarget;
    this.leaderPane = config.leaderPane;
  }

  async getChatHistory(): Promise<TuiChatMessage[]> {
    const messages = await this.messageBridge.list(this.messageLimit);
    return messages.flatMap((message) => this.mapMessage(message));
  }

  async getHealth(): Promise<TuiHealthSnapshot> {
    const health = await this.healthProvider();
    if (health.command.status === "failed") {
      return health;
    }
    if (this.lastCommand) {
      return { ...health, command: this.lastCommand };
    }
    return health;
  }

  async execute(command: TuiCommand): Promise<TuiCommandResult> {
    try {
      switch (command.type) {
        case "send_message":
          await this.messageBridge.post("User", command.message.content, this.buildMetadata(command));
          this.lastCommand = { status: "healthy", lastResult: "success" };
          return { ok: true };
        case "set_target":
          this.currentTarget = command.target;
          this.lastCommand = { status: "healthy", lastResult: "success" };
          return { ok: true };
        case "set_leader_pane":
          this.leaderPane = command.leaderPane;
          this.lastCommand = { status: "healthy", lastResult: "success" };
          return { ok: true };
        default:
          return this.failCommand("VALIDATION_FAILED", "Unknown TUI command");
      }
    } catch (error: unknown) {
      return this.failFromError(error);
    }
  }

  private mapMessage(message: Message): TuiChatMessage[] {
    const metadata = (message.metadata ?? {}) as Record<string, unknown>;
    const inferredTarget = this.inferTarget(message.sender);
    const target = this.parseTarget(metadata.target, inferredTarget);
    const role = this.parseRole(metadata.role);
    const paneHint = this.parsePane(metadata.pane);
    const broadcastHeader = typeof metadata.broadcastHeader === "string" ? metadata.broadcastHeader : undefined;
    const waitingForAgentId =
      typeof metadata.waitingForAgentId === "string" ? metadata.waitingForAgentId : undefined;

    const base = {
      id: message.id,
      timestamp: message.timestamp,
      author: message.sender,
      content: message.content,
      target,
      role,
      metadata: {
        broadcastHeader,
        waitingForAgentId,
      },
    };

    if (target === "broadcast") {
      const panes = paneHint ? [paneHint] : (["left", "right"] as const);
      return panes.map((pane) => ({ ...base, pane }));
    }

    const pane = paneHint ?? (target === "left" || target === "right" ? target : this.inferPane(message.sender));
    return [{ ...base, pane }];
  }

  private buildMetadata(command: Extract<TuiCommand, { type: "send_message" }>): Record<string, unknown> {
    const metadata = { ...(command.message.metadata ?? {}) } as Record<string, unknown>;
    metadata.target = command.message.target;
    if (command.message.role) metadata.role = command.message.role;
    if (command.message.target !== "broadcast") {
      metadata.pane = command.message.target;
    } else if (!metadata.broadcastHeader) {
      metadata.broadcastHeader = this.config.broadcastHeader;
    }
    return metadata;
  }

  private inferTarget(sender: string): TuiTarget {
    if (sender === this.config.paneAgents.left) return "left";
    if (sender === this.config.paneAgents.right) return "right";
    return this.currentTarget;
  }

  private inferPane(sender: string): TuiPane {
    if (sender === this.config.paneAgents.left) return "left";
    if (sender === this.config.paneAgents.right) return "right";
    return this.leaderPane;
  }

  private parseTarget(value: unknown, fallback: TuiTarget): TuiTarget {
    const parsed = TuiTargetSchema.safeParse(value);
    return parsed.success ? parsed.data : fallback;
  }

  private parseRole(value: unknown): TuiRole {
    const parsed = TuiRoleSchema.safeParse(value);
    return parsed.success ? parsed.data : "none";
  }

  private parsePane(value: unknown): TuiPane | null {
    const parsed = TuiPaneSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }

  private failFromError(error: unknown): TuiCommandResult {
    const code = this.parseErrorCode(error);
    const message = error instanceof Error ? error.message : "Command failed";
    this.lastCommand = { status: "degraded", lastResult: "error", lastError: message };
    return { ok: false, error: { code, message } };
  }

  private failCommand(code: TuiError["code"], message: string): TuiCommandResult {
    this.lastCommand = { status: "degraded", lastResult: "error", lastError: message };
    return { ok: false, error: { code, message } };
  }

  private parseErrorCode(error: unknown): TuiError["code"] {
    if (error && typeof error === "object" && "code" in error) {
      const parsed = AppErrorCodeSchema.safeParse((error as { code?: unknown }).code);
      if (parsed.success) return parsed.data;
    }
    return "INTERNAL_ERROR";
  }
}
