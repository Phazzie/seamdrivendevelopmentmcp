// Purpose: render the headless cockpit TUI dashboard (tui seam).
import blessed from "blessed";
import type {
  ITuiDataClient,
  TuiConfig,
  TuiInputState,
  TuiViewModel,
} from "../../../contracts/tui.contract.js";
import type { ITelemetryClient, LogLine } from "../../../contracts/telemetry.contract.js";
import { deriveViewModel } from "../logic/view_model.js";

const LOG_SNIPPET_LIMIT = 48;

type TelemetrySource = {
  id: string;
  filePath: string;
  pane: "left" | "right";
};

type CockpitOptions = {
  revisionStream: AsyncIterable<number>;
  telemetry?: {
    client: ITelemetryClient;
    sources: TelemetrySource[];
  };
};

/**
 * Purpose: Render a read-only observability HUD.
 * Hardened: Headless, non-interactive, event-driven.
 */
export async function startCockpitUi(
  client: ITuiDataClient,
  config: TuiConfig,
  options: CockpitOptions
): Promise<void> {
  const inputState: TuiInputState = {
    target: config.defaultTarget,
    broadcastHeader: config.broadcastHeader,
  };

  const screen = blessed.screen({
    smartCSR: true,
    title: "Mission Control HUD",
  });

  const header = blessed.box({
    top: 0,
    left: 0,
    width: "100%",
    height: 1,
    tags: true,
    style: { fg: "white", bg: "blue" },
  });

  const leftPane = blessed.box({
    top: 1,
    left: 0,
    bottom: 2,
    width: "50%",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    border: "line",
    label: "Left Log",
  });

  const rightPane = blessed.box({
    top: 1,
    left: "50%",
    bottom: 2,
    width: "50%",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    border: "line",
    label: "Right Log",
  });

  const statusBar = blessed.box({
    bottom: 0,
    left: 0,
    width: "100%",
    height: 2,
    tags: true,
    border: { type: "line" },
    style: { border: { fg: "gray" } }
  });

  screen.append(header);
  screen.append(leftPane);
  screen.append(rightPane);
  screen.append(statusBar);

  screen.key(["C-c", "q"], () => {
    screen.destroy();
    process.exit(0);
  });

  const logState: Record<"left" | "right", string> = {
    left: "",
    right: "",
  };
  let lastViewModel: TuiViewModel | null = null;

  function renderViewModel(viewModel: TuiViewModel): void {
    header.setContent(formatHealth(viewModel));
    leftPane.setLabel(formatPaneLabel(config.paneAgents.left, viewModel.panes.left.waitingForAgentId));
    rightPane.setLabel(formatPaneLabel(config.paneAgents.right, viewModel.panes.right.waitingForAgentId));
    leftPane.setContent(formatMessages(viewModel.panes.left.messages));
    rightPane.setContent(formatMessages(viewModel.panes.right.messages));
    leftPane.setScrollPerc(100);
    rightPane.setScrollPerc(100);
    lastViewModel = viewModel;
    renderStatusBar(statusBar, viewModel, logState);
  }

  async function refresh(): Promise<void> {
    try {
      const [history, health] = await Promise.all([client.getChatHistory(), client.getHealth()]);
      const viewModel = deriveViewModel(config, inputState, history, health);
      renderViewModel(viewModel);
      screen.render();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Refresh failed";
      header.setContent(`{red-fg}Error: ${message}{/red-fg}`);
      screen.render();
    }
  }

  // Start Telemetry
  if (options.telemetry) {
    for (const source of options.telemetry.sources) {
      void (async () => {
        try {
          for await (const line of options.telemetry!.client.tail(source.id, source.filePath)) {
            logState[source.pane] = line.content.trim();
            if (lastViewModel) renderStatusBar(statusBar, lastViewModel, logState);
            screen.render();
          }
        } catch (e) {
          logState[source.pane] = "ERR";
        }
      })();
    }
  }

  // Drive UI via Revision Pulse
  (async () => {
    for await (const _revision of options.revisionStream) {
      await refresh();
    }
  })();
}

function formatPaneLabel(base: string, waitingForAgentId?: string): string {
  if (!waitingForAgentId) return base;
  return `${base} {yellow-fg}[waiting: ${waitingForAgentId}]{/yellow-fg}`;
}

function formatMessages(messages: TuiViewModel["panes"]["left"]["messages"]):
 string {
  return messages
    .map((msg) => `${msg.author}: ${msg.content}`)
    .join("\n");
}

function renderStatusBar(
  statusBar: blessed.Widgets.BoxElement,
  viewModel: TuiViewModel,
  logState: Record<"left" | "right", string>
): void {
  const leftLog = formatLogSnippet(logState.left);
  const rightLog = formatLogSnippet(logState.right);
  const logText = `Logs L:${leftLog} R:${rightLog}`;
  statusBar.setContent(` Revision: ${viewModel.health.persistence.status === "healthy" ? "v" : "!"} | ${logText}`);
}

function formatLogSnippet(value: string): string {
  if (!value) return "-";
  if (value.length <= LOG_SNIPPET_LIMIT) return value;
  return `${value.slice(0, LOG_SNIPPET_LIMIT - 3)}...`;
}

function formatHealth(viewModel: TuiViewModel): string {
  const { persistence, state, compliance } = viewModel.health;
  
  let complianceIcon = "⚠️";
  let complianceColor = "red-fg";
  let complianceLabel = "0%";

  if (compliance.status === "healthy") {
    complianceIcon = "🛡️";
    complianceColor = "green-fg";
    complianceLabel = `${(compliance.score * 100).toFixed(0)}%`;
  }

  const complianceText = `{${complianceColor}}[${complianceIcon} SDD ${complianceLabel}]{/${complianceColor}}`;

  return `${complianceText}  Persistence: ${formatStatus(persistence.status)}  State: ${formatStatus(state.status)}`;
}

function formatStatus(status: string): string {
  if (status === "healthy" || status === "synced") return `{green-fg}${status}{/green-fg}`;
  if (status === "degraded" || status === "stale") return `{yellow-fg}${status}{/yellow-fg}`;
  return `{red-fg}${status}{/red-fg}`;
}