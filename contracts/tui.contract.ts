// Purpose: define Mission Control TUI contracts (tui seam).
import { z } from "zod";
import { AppErrorCodeSchema } from "./store.contract.js";

// Mapping notes (tool boundary):
// - Data: chat history + seam health sourced from TUI chat/health seams.
// - Commands: send_message -> MCP message tools; set_target/set_leader_pane update local config.

export const TuiPaneSchema = z.enum(["left", "right"]);
export type TuiPane = z.infer<typeof TuiPaneSchema>;

export const TuiTargetSchema = z.enum(["left", "right", "broadcast"]);
export type TuiTarget = z.infer<typeof TuiTargetSchema>;

export const TuiRoleSchema = z.enum(["leader", "follower", "none"]);
export type TuiRole = z.infer<typeof TuiRoleSchema>;

export const TuiChatMetadataSchema = z.object({
  broadcastHeader: z.string().optional(),
  waitingForAgentId: z.string().optional(),
});
export type TuiChatMetadata = z.infer<typeof TuiChatMetadataSchema>;

export const TuiChatMessageSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number(),
  author: z.string(),
  content: z.string(),
  pane: TuiPaneSchema,
  target: TuiTargetSchema,
  role: TuiRoleSchema,
  metadata: TuiChatMetadataSchema,
});
export type TuiChatMessage = z.infer<typeof TuiChatMessageSchema>;

export const TuiPersistenceHealthSchema = z.object({
  status: z.enum(["healthy", "degraded", "failed"]),
  latencyMs: z.number().int().nonnegative(),
});
export type TuiPersistenceHealth = z.infer<typeof TuiPersistenceHealthSchema>;

export const TuiTelemetryHealthSchema = z.object({
  status: z.enum(["healthy", "degraded"]),
  bufferUsage: z.number().int().nonnegative(),
});
export type TuiTelemetryHealth = z.infer<typeof TuiTelemetryHealthSchema>;

export const TuiStateHealthSchema = z.object({
  status: z.enum(["synced", "stale"]),
  driftMs: z.number().int().nonnegative(),
});
export type TuiStateHealth = z.infer<typeof TuiStateHealthSchema>;

export const TuiCommandHealthSchema = z.object({
  status: z.enum(["healthy", "degraded", "failed"]),
  lastResult: z.enum(["success", "error"]),
  lastError: z.string().optional(),
});
export type TuiCommandHealth = z.infer<typeof TuiCommandHealthSchema>;

export const TuiComplianceHealthSchema = z.object({
  status: z.enum(["healthy", "failed", "error"]),
  score: z.number().min(0).max(1),
  error: z.string().optional(),
});
export type TuiComplianceHealth = z.infer<typeof TuiComplianceHealthSchema>;

export const TuiHealthSnapshotSchema = z.object({
  persistence: TuiPersistenceHealthSchema,
  telemetry: TuiTelemetryHealthSchema,
  state: TuiStateHealthSchema,
  command: TuiCommandHealthSchema,
  compliance: TuiComplianceHealthSchema,
});
export type TuiHealthSnapshot = z.infer<typeof TuiHealthSnapshotSchema>;

export const TuiChatScenarioSchema = z.object({
  history: z.array(TuiChatMessageSchema),
  health: TuiHealthSnapshotSchema,
});
export type TuiChatScenario = z.infer<typeof TuiChatScenarioSchema>;

export const TuiChatFixtureSchema = z.object({
  captured_at: z.string().optional(),
  scenarios: z.record(z.string(), TuiChatScenarioSchema),
});
export type TuiChatFixture = z.infer<typeof TuiChatFixtureSchema>;

export const TuiConfigSchema = z.object({
  paneAgents: z
    .object({
      left: z.string().min(1),
      right: z.string().min(1),
    })
    .default({ left: "Gemini", right: "Codex" }),
  leaderPane: TuiPaneSchema.default("left"),
  defaultTarget: TuiTargetSchema.default("left"),
  broadcastHeader: z.string().default("BROADCAST -> ALL"),
  enforceLeaderWait: z.boolean().default(true),
});
export type TuiConfig = z.infer<typeof TuiConfigSchema>;

export const TuiInputStateSchema = z.object({
  target: TuiTargetSchema,
  broadcastHeader: z.string().optional(),
});
export type TuiInputState = z.infer<typeof TuiInputStateSchema>;

export const TuiPaneStateSchema = z.object({
  agentId: z.string().min(1),
  role: TuiRoleSchema,
  waitingForAgentId: z.string().optional(),
  messages: z.array(TuiChatMessageSchema),
});
export type TuiPaneState = z.infer<typeof TuiPaneStateSchema>;

export const TuiViewModelSchema = z.object({
  panes: z.object({
    left: TuiPaneStateSchema,
    right: TuiPaneStateSchema,
  }),
  health: TuiHealthSnapshotSchema,
  input: TuiInputStateSchema,
});
export type TuiViewModel = z.infer<typeof TuiViewModelSchema>;

export const TuiSendMessageSchema = z.object({
  target: TuiTargetSchema,
  content: z.string().min(1),
  role: TuiRoleSchema.optional(),
  metadata: TuiChatMetadataSchema.optional(),
});
export type TuiSendMessage = z.infer<typeof TuiSendMessageSchema>;

export const TuiCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("send_message"), message: TuiSendMessageSchema }),
  z.object({ type: z.literal("set_target"), target: TuiTargetSchema }),
  z.object({ type: z.literal("set_leader_pane"), leaderPane: TuiPaneSchema }),
]);
export type TuiCommand = z.infer<typeof TuiCommandSchema>;

export const TuiErrorSchema = z.object({
  code: AppErrorCodeSchema,
  message: z.string(),
  details: z.record(z.string(), z.any()).optional(),
});
export type TuiError = z.infer<typeof TuiErrorSchema>;

export const TuiCommandResultSchema = z.object({
  ok: z.boolean(),
  error: TuiErrorSchema.optional(),
});
export type TuiCommandResult = z.infer<typeof TuiCommandResultSchema>;

export interface ITuiDataClient {
  getChatHistory(): Promise<TuiChatMessage[]>;
  getHealth(): Promise<TuiHealthSnapshot>;
  execute(command: TuiCommand): Promise<TuiCommandResult>;
}
