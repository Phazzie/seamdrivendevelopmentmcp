// Purpose: Verify TUI adapter against contract (tui seam).
import { describe } from "node:test";
import path from "path";
import type { TuiChatMessage, TuiConfig } from "../../contracts/tui.contract.js";
import { TuiDataAdapter, createStatusHealthProvider } from "../../src/tui/adapters/tui.adapter.js";
import { MockMessageBridge } from "../../src/lib/mocks/messages.mock.js";
import { MockStatusReader } from "../../src/lib/mocks/status.mock.js";
import { MockTelemetryClient } from "../../src/lib/mocks/telemetry.mock.js";
import { runTuiContractTests } from "./tui.test.js";

describe("Real TuiDataAdapter (with MockStore)", () => {
  const config: TuiConfig = {
    paneAgents: { left: "Gemini", right: "Codex" },
    leaderPane: "left",
    defaultTarget: "broadcast",
    broadcastHeader: "HUD",
    enforceLeaderWait: true
  };

  runTuiContractTests(async () => {
    const mockMessages = new MockMessageBridge(path.join(process.cwd(), "fixtures/messages/sample.json"));
    const statusReader = new MockStatusReader(path.join(process.cwd(), "fixtures/status/snapshot.json"));
    const telemetry = new MockTelemetryClient(path.join(process.cwd(), "fixtures/telemetry/fs_watch.json"));
    
    // Mock SDD tracking for report
    const mockSddTracking: any = {
      getReport: async () => ({ isHealthy: true, overallScore: 1 })
    };

    const healthProvider = createStatusHealthProvider(statusReader, mockSddTracking, telemetry);
    return new TuiDataAdapter(config, mockMessages, healthProvider);
  });
});