/**
 * Purpose: Transform raw data into TUI View Model (tui seam).
 */
import {
  TuiChatMessage,
  TuiConfig,
  TuiHealthSnapshot,
  TuiInputState,
  TuiPaneState,
  TuiViewModel,
} from "../../../contracts/tui.contract.js";

/**
 * Derives the TUI View Model from input data and configuration.
 * This is a pure function, easily testable against fixtures.
 */
export function deriveViewModel(
  config: TuiConfig,
  input: TuiInputState,
  history: TuiChatMessage[],
  health: TuiHealthSnapshot
): TuiViewModel {
  // Filter messages for each pane based on configuration
  const leftPaneMessages = history.filter((m) => m.pane === "left");
  const rightPaneMessages = history.filter((m) => m.pane === "right");

  // Determine roles and waiting states (last message heuristic)
  const leftLastMsg = leftPaneMessages[leftPaneMessages.length - 1];
  const rightLastMsg = rightPaneMessages[rightPaneMessages.length - 1];

  const leftPane: TuiPaneState = {
    agentId: config.paneAgents.left,
    role: leftLastMsg?.role || "none",
    waitingForAgentId: leftLastMsg?.metadata?.waitingForAgentId,
    messages: leftPaneMessages,
  };

  const rightPane: TuiPaneState = {
    agentId: config.paneAgents.right,
    role: rightLastMsg?.role || "none",
    waitingForAgentId: rightLastMsg?.metadata?.waitingForAgentId,
    messages: rightPaneMessages,
  };

  return {
    panes: {
      left: leftPane,
      right: rightPane,
    },
    health,
    input,
  };
}
