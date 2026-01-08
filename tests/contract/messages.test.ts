import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import type { IMessageBridge, Message } from "../../contracts/messages.contract.js";
import { MockMessageBridge } from "../../src/lib/mocks/messages.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "messages", "sample.json");

type MessageFixture = {
  captured_at?: string;
  revision?: number;
  messages?: Message[];
};

function loadFixture(): MessageFixture {
  if (!fs.existsSync(FIXTURE_PATH)) return {};
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  return JSON.parse(raw) as MessageFixture;
}

function loadFixtureMessages(): Message[] {
  const fixture = loadFixture();
  return Array.isArray(fixture.messages) ? fixture.messages : [];
}

function loadFixtureRevision(): number | null {
  const fixture = loadFixture();
  return typeof fixture.revision === "number" ? fixture.revision : null;
}

export function runMessageContractTests(createBridge: () => Promise<IMessageBridge>) {
  describe("Message Bridge Contract", () => {
    let bridge: IMessageBridge;

    beforeEach(async () => {
      bridge = await createBridge();
    });

    it("should load fixture messages when present", async () => {
      const fixtureMessages = loadFixtureMessages();
      const list = await bridge.list();
      assert.strictEqual(list.length, fixtureMessages.length);
      if (fixtureMessages.length) {
        assert.strictEqual(list[0].id, fixtureMessages[0].id);
      }
    });

    it("should post and list messages", async () => {
      const baseline = await bridge.list();
      await bridge.post("codex", "hello");
      const list = await bridge.list();
      assert.strictEqual(list.length, baseline.length + 1);
      assert.ok(list.find((msg) => msg.content === "hello"));
    });

    it("should filter messages by channel", async () => {
      await bridge.post("codex", "general message");
      await bridge.post("codex", "ops message", { channelId: "ops" });
      const list = await bridge.list({ channelId: "ops" });
      assert.ok(list.every((msg) => msg.channelId === "ops"));
      assert.ok(list.find((msg) => msg.content === "ops message"));
    });

    it("should wait for update (async)", async () => {
      const fixtureRevision = loadFixtureRevision();
      const sinceRevision = typeof fixtureRevision === "number" ? fixtureRevision : 1;
      // Use the fixture revision so we exercise the wait path, not the fast-return path.
      const waitPromise = bridge.waitForUpdate(sinceRevision, 500);
      
      // Simulate activity
      setTimeout(() => {
        bridge.post("codex", "trigger"); // This should bump rev to 2
      }, 50);

      const result = await waitPromise;
      assert.ok(result);
      assert.ok(result.revision > 1);
    });

    it("should timeout if no update", async () => {
      const timeoutMs = 100;
      const start = Date.now();
      const result = await bridge.waitForUpdate(100, timeoutMs); // Unreachable revision
      const elapsed = Date.now() - start;

      assert.strictEqual(result, null);
      assert.ok(elapsed >= timeoutMs - 10);
    });

    it("should return immediately if already fresh", async () => {
        // Setup: Bump revision to 2
        await bridge.post("codex", "bump"); 
        
        const start = Date.now();
        // Ask for updates since 0. Current is 2. Should return instantly.
        const result = await bridge.waitForUpdate(0, 1000); 
        const elapsed = Date.now() - start;
        
        assert.ok(result);
        assert.ok(elapsed < 20); // Should be near instant
    });
  });
}

describe("MockMessageBridge", () => {
  runMessageContractTests(async () => new MockMessageBridge());
});
