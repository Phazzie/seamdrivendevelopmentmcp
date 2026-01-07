// Purpose: validate TUI contract behavior against fixtures (tui seam).
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import type { ITuiDataClient, TuiChatFixture } from "../../contracts/tui.contract.js";
import { TuiChatFixtureSchema } from "../../contracts/tui.contract.js";
import { MockTuiDataClient } from "../../src/lib/mocks/tui.mock.js";

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

export function runTuiContractTests(createClient: () => Promise<ITuiDataClient>) {
  describe("TUI Data Client Contract", () => {
    let client: ITuiDataClient;
    let fixtures: TuiChatFixture;

    beforeEach(async () => {
      fixtures = loadFixture();
      client = await createClient();
    });

    it("loads the idle scenario history", async () => {
      const history = await client.getChatHistory();
      const idle = fixtures.idle;
      assert.ok(idle);
      assert.strictEqual(history.length, idle.history.length);
      if (idle.history.length) {
        assert.strictEqual(history[0].id, idle.history[0].id);
      }
    });

    it("returns fixture health for the scenario", async () => {
      const health = await client.getHealth();
      const idle = fixtures.idle;
      assert.ok(idle);
      assert.strictEqual(health.persistence.status, idle.health.persistence.status);
    });

    it("appends sent messages", async () => {
      const baseline = await client.getChatHistory();
      const result = await client.execute({
        type: "send_message",
        message: { target: "left", content: "hello" },
      });
      assert.strictEqual(result.ok, true);
      const next = await client.getChatHistory();
      assert.strictEqual(next.length, baseline.length + 1);
      assert.strictEqual(next[next.length - 1]?.content, "hello");
    });

    it("routes broadcast messages to both panes", async () => {
      await client.execute({ type: "set_leader_pane", leaderPane: "right" });
      await client.execute({
        type: "send_message",
        message: { target: "broadcast", content: "broadcast" },
      });
      const history = await client.getChatHistory();
      const lastTwo = history.slice(-2);
      const panes = lastTwo.map((msg) => msg.pane).sort();
      assert.strictEqual(lastTwo.length, 2);
      assert.deepStrictEqual(panes, ["left", "right"]);
      assert.ok(lastTwo.every((msg) => msg.target === "broadcast"));
    });
  });
}

describe("MockTuiDataClient", () => {
  runTuiContractTests(async () => new MockTuiDataClient());

  it("loads named scenarios", async () => {
    const fixtures = loadFixture();
    const client = new MockTuiDataClient({ scenario: "broadcast_waiting" });
    const history = await client.getChatHistory();
    const scenario = fixtures.broadcast_waiting;
    assert.ok(scenario);
    assert.strictEqual(history.length, scenario.history.length);
    assert.strictEqual(history[history.length - 1]?.role, "follower");
  });
});
