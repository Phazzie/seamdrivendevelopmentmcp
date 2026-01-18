import { describe, it } from "node:test";
import assert from "node:assert";
import path from "path";
import type { ITuiDataClient } from "../../contracts/tui.contract.js";
import { MockTuiDataClient } from "../../src/lib/mocks/tui.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "tui", "sample.json");

export function runTuiContractTests(create: () => Promise<ITuiDataClient>) {
  describe("TUI Data Client Contract", () => {
    it("loads chat history", async () => {
      const client = await create();
      const history = await client.getChatHistory();
      assert.ok(Array.isArray(history));
    });

    it("returns health snapshot", async () => {
      const client = await create();
      const health = await client.getHealth();
      assert.ok(health.persistence);
    });
  });
}

describe("MockTuiDataClient", () => {
  runTuiContractTests(async () => new MockTuiDataClient(FIXTURE_PATH));

  it("loads named scenarios", async () => {
    const client = new MockTuiDataClient(FIXTURE_PATH, "idle");
    const history = await client.getChatHistory();
    assert.ok(Array.isArray(history));
  });
});
