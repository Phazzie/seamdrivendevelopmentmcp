// Purpose: validate TUI adapter against fixtures using real seams (tui seam).
import { describe } from "node:test";
import fs from "fs";
import path from "path";
import type { Message } from "../../contracts/messages.contract.js";
import type { TuiChatFixture, TuiChatMessage, TuiConfig } from "../../contracts/tui.contract.js";
import { TuiChatFixtureSchema } from "../../contracts/tui.contract.js";
import { runTuiContractTests } from "./tui.test.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";
import { MessageAdapter } from "../../src/lib/adapters/messages.adapter.js";
import { StatusAdapter } from "../../src/lib/adapters/status.adapter.js";
import { createStatusHealthProvider, TuiDataAdapter } from "../../src/tui/adapters/tui.adapter.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "tui", "chat_simulation.json");

function loadFixture(): TuiChatFixture {
  if (!fs.existsSync(FIXTURE_PATH)) return {};
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const result = TuiChatFixtureSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid TUI fixture: ${result.error.message}`);
  }
  return result.data;
}

function toMessages(history: TuiChatMessage[]): Message[] {
  return history.map((entry) => ({
    id: entry.id,
    sender: entry.author,
    content: entry.content,
    timestamp: entry.timestamp,
    channelId: "general",
    metadata: {
      target: entry.target,
      role: entry.role,
      pane: entry.pane,
      broadcastHeader: entry.metadata.broadcastHeader,
      waitingForAgentId: entry.metadata.waitingForAgentId,
    },
  }));
}

const config: TuiConfig = {
  paneAgents: { left: "Gemini", right: "Codex" },
  leaderPane: "left",
  defaultTarget: "left",
  broadcastHeader: "BROADCAST -> ALL",
  enforceLeaderWait: true,
};

describe("Real TuiDataAdapter (with MockStore)", () => {
  runTuiContractTests(async () => {
    const fixture = loadFixture();
    const idle = fixture.idle;
    const seedMessages = idle ? toMessages(idle.history) : [];
    const store = new MockStore({ messages: seedMessages });
    const messageBridge = new MessageAdapter(store);
    const statusReader = new StatusAdapter(store);
    const healthProvider = createStatusHealthProvider(statusReader);
    return new TuiDataAdapter(config, messageBridge, async () => {
      if (idle) return idle.health;
      return healthProvider();
    });
  });
});
