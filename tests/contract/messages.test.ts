import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import path from "path";
import type { IMessageBridge } from "../../contracts/messages.contract.js";
import { MockMessageBridge } from "../../src/lib/mocks/messages.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "messages", "sample.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "messages", "fault.json");

export function runMessageContractTests(createBridge: () => Promise<IMessageBridge>) {
  describe("Message Bridge Contract", () => {
    let bridge: IMessageBridge;

    beforeEach(async () => {
      bridge = await createBridge();
    });

    it("should post and list messages", async () => {
      const msg = await bridge.post("User", "Hello");
      assert.strictEqual(msg.content, "Hello");
    });
  });
}

describe("MockMessageBridge", () => {
  runMessageContractTests(async () => new MockMessageBridge(FIXTURE_PATH));

  it("should fail when loading fault fixture (missing_author)", async () => {
    const mock = new MockMessageBridge(FAULT_PATH, "missing_author");
    await assert.rejects(async () => {
      await mock.post("", "Hello");
    }, (err: any) => err.code === "VALIDATION_FAILED" && err.message.includes("sender is required"));
  });
});