// Purpose: render the cockpit TUI layout (tui seam).
import blessed from "blessed";
import type {
  ITuiDataClient,
  TuiConfig,
  TuiInputState,
  TuiTarget,
  TuiViewModel,
} from "../../../contracts/tui.contract.js";
import type { ITelemetryClient, LogLine } from "../../../contracts/telemetry.contract.js";
import { deriveViewModel } from "../logic/view_model.js";

const DEFAULT_REFRESH_MS = 1000;
const LOG_SNIPPET_LIMIT = 48;

type TelemetrySource = {
  id: string;
  filePath: string;
  pane: "left" | "right";
};

type CockpitOptions = {
  refreshIntervalMs?: number;
  telemetry?: {
    client: ITelemetryClient;
    sources: TelemetrySource[];
  };
};

export async function startCockpitUi(
  client: ITuiDataClient,
  config: TuiConfig,
  options: CockpitOptions = {}
): Promise<void> {
  const refreshIntervalMs = options.refreshIntervalMs ?? DEFAULT_REFRESH_MS;
  const inputState: TuiInputState = {
    target: config.defaultTarget,
    broadcastHeader: config.broadcastHeader,
  };

  const screen = blessed.screen({
    smartCSR: true,
    title: "Mission Control Cockpit",
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
    bottom: 5,
    width: "50%",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    border: "line",
    label: "Left",
  });

  const rightPane = blessed.box({
    top: 1,
    left: "50%",
    bottom: 5,
    width: "50%",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    border: "line",
    label: "Right",
  });

  const statusBar = blessed.box({
    bottom: 4,
    left: 0,
    width: "100%",
    height: 1,
    tags: true,
  });

  const targetBar = blessed.box({
    bottom: 3,
    left: 0,
    width: "100%",
    height: 1,
    tags: true,
    mouse: true,
  });

  const input = blessed.textbox({
    bottom: 0,
    left: 0,
    width: "100%",
    height: 3,
    keys: true,
    mouse: true,
    inputOnFocus: true,
    border: "line",
    label: "Message",
  });

  screen.append(header);
  screen.append(leftPane);
  screen.append(rightPane);
  screen.append(statusBar);
  screen.append(targetBar);
  screen.append(input);

  screen.key(["C-c", "q", "escape"], () => {
    screen.destroy();
    process.exit(0);
  });

  screen.key(["tab"], () => setTarget(nextTarget(inputState.target)));
  screen.key(["1"], () => setTarget("left"));
  screen.key(["2"], () => setTarget("right"));
  screen.key(["3"], () => setTarget("broadcast"));

  const inputListenerHost = input as unknown as {
    _listener: (ch: string, key: blessed.Widgets.Events.IKeyEventArg) => void;
  };
  const baseInputListener = inputListenerHost._listener.bind(input);
  inputListenerHost._listener = (ch, key) => {
    if (key?.meta && (key.name === "1" || key.name === "2" || key.name === "3")) {
      const target = key.name === "1" ? "left" : key.name === "2" ? "right" : "broadcast";
      setTarget(target);
      return;
    }
    if (key?.name === "tab") {
      setTarget(nextTarget(inputState.target));
      return;
    }
    return baseInputListener(ch, key);
  };

  targetBar.on("click", (data) => {
    const width =
      typeof targetBar.width === "number"
        ? targetBar.width
        : typeof screen.width === "number"
          ? screen.width
          : 0;
    const segmentWidth = Math.max(1, Math.floor(width / 3));
    const segment = Math.min(2, Math.floor((data.x ?? 0) / segmentWidth));
    const target: TuiTarget = segment === 0 ? "left" : segment === 1 ? "right" : "broadcast";
    setTarget(target);
  });

  input.on("submit", async (value) => {
    const content = value.trim();
    if (content.length) {
      await client.execute({
        type: "send_message",
        message: {
          target: inputState.target,
          content,
          metadata: inputState.target === "broadcast" ? { broadcastHeader: config.broadcastHeader } : undefined,
        },
      });
    }
    input.clearValue();
    input.focus();
    await refresh();
  });

  function setTarget(target: TuiTarget): void {
    inputState.target = target;
    client.execute({ type: "set_target", target }).catch(() => undefined);
    renderTargets(target);
    screen.render();
  }

  function renderTargets(target: TuiTarget): void {
    const left = target === "left" ? "{inverse}Left{/inverse}" : "Left";
    const right = target === "right" ? "{inverse}Right{/inverse}" : "Right";
    const broadcast = target === "broadcast" ? "{inverse}Broadcast{/inverse}" : "Broadcast";
    targetBar.setContent(`Target: ${left}  ${right}  ${broadcast}  (Tab/1/2/3/Alt+1/2/3)`);
  }

  const logState: Record<"left" | "right", string> = {
    left: "",
    right: "",
  };
  let lastViewModel: TuiViewModel | null = null;

  function renderViewModel(viewModel: TuiViewModel): void {
    header.setContent(formatHealth(viewModel));
    leftPane.setLabel(formatPaneLabel("Left", viewModel.panes.left.waitingForAgentId));
    rightPane.setLabel(formatPaneLabel("Right", viewModel.panes.right.waitingForAgentId));
    leftPane.setContent(formatMessages(viewModel.panes.left.messages));
    rightPane.setContent(formatMessages(viewModel.panes.right.messages));
    leftPane.setScrollPerc(100);
    rightPane.setScrollPerc(100);
    renderTargets(viewModel.input.target);
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

  renderTargets(inputState.target);
  input.focus();
  await refresh();
  startTelemetryTail(logState, statusBar, () => lastViewModel, options.telemetry);
  setInterval(() => {
    refresh().catch(() => undefined);
  }, refreshIntervalMs);
}

function nextTarget(current: TuiTarget): TuiTarget {
  if (current === "left") return "right";
  if (current === "right") return "broadcast";
  return "left";
}

function formatPaneLabel(base: string, waitingForAgentId?: string): string {
  if (!waitingForAgentId) return base;
  return `${base} {yellow-fg}[waiting: ${waitingForAgentId}]{/yellow-fg}`;
}

function formatMessages(messages: TuiViewModel["panes"]["left"]["messages"]): string {
  return messages
    .map((msg) => {
      const prefix = msg.metadata.broadcastHeader ? `[${msg.metadata.broadcastHeader}] ` : "";
      return `${prefix}${msg.author}: ${msg.content}`;
    })
    .join("\n");
}

function renderStatusBar(
  statusBar: blessed.Widgets.BoxElement,
  viewModel: TuiViewModel,
  logState: Record<"left" | "right", string>
): void {
  const command = viewModel.health.command;
  const commandText =
    command.status === "failed"
      ? `{red-fg}Command error: ${command.lastError ?? "unknown"}{/red-fg}`
      : `Command: ${formatStatus(command.status)}`;
  const leftLog = formatLogSnippet(logState.left);
  const rightLog = formatLogSnippet(logState.right);
  const logText = `Logs L:${leftLog} R:${rightLog}`;
  const content = `${commandText} | ${logText}`;
  statusBar.setContent(content);
}

function startTelemetryTail(
  logState: Record<"left" | "right", string>,
  statusBar: blessed.Widgets.BoxElement,
  getViewModel: () => TuiViewModel | null,
  telemetry?: { client: ITelemetryClient; sources: TelemetrySource[] }
): void {
  if (!telemetry) return;
  for (const source of telemetry.sources) {
    void streamTelemetry(source, telemetry.client, logState, statusBar, getViewModel);
  }
}

async function streamTelemetry(
  source: TelemetrySource,
  client: ITelemetryClient,
  logState: Record<"left" | "right", string>,
  statusBar: blessed.Widgets.BoxElement,
  getViewModel: () => TuiViewModel | null
): Promise<void> {
  try {
    for await (const line of client.tail(source.id, source.filePath)) {
      logState[source.pane] = formatLogLine(line);
      const viewModel = getViewModel();
      if (viewModel) {
        renderStatusBar(statusBar, viewModel, logState);
      } else {
        statusBar.setContent(`Logs L:${formatLogSnippet(logState.left)} R:${formatLogSnippet(logState.right)}`);
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "telemetry error";
    logState[source.pane] = `error: ${message}`;
    const viewModel = getViewModel();
    if (viewModel) {
      renderStatusBar(statusBar, viewModel, logState);
    }
  }
}

function formatLogLine(line: LogLine): string {
  return line.content.replace(/\s+/g, " ").trim();
}

function formatLogSnippet(value: string): string {
  if (!value) return "-";
  if (value.length <= LOG_SNIPPET_LIMIT) return value;
  return `${value.slice(0, LOG_SNIPPET_LIMIT - 3)}...`;
}

function formatHealth(viewModel: TuiViewModel): string {
  const { persistence, telemetry, state, command } = viewModel.health;
  return `Persistence: ${formatStatus(persistence.status)}  Telemetry: ${formatStatus(
    telemetry.status
  )}  State: ${formatStatus(state.status)}  Command: ${formatStatus(command.status)}`;
}

function formatStatus(status: string): string {
  if (status === "healthy" || status === "synced") return `{green-fg}${status}{/green-fg}`;
  if (status === "degraded" || status === "stale") return `{yellow-fg}${status}{/yellow-fg}`;
  return `{red-fg}${status}{/red-fg}`;
}
