import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import path from "path";
import type { IEventStream } from "../../contracts/event_stream.contract.js";
import { MockEventStream } from "../../src/lib/mocks/event_stream.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "event_stream", "sample.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "event_stream", "fault.json");

export function runEventContractTests(createStream: () => Promise<IEventStream>) {
  describe("Event Stream Contract", () => {
    let stream: IEventStream;

    beforeEach(async () => {
      stream = await createStream();
    });

    it("should load fixture events when present", async () => {
      const list = await stream.list();
      assert.ok(Array.isArray(list));
    });
  });
}

describe("MockEventStream", () => {
  runEventContractTests(async () => new MockEventStream(FIXTURE_PATH));

  it("should fail when loading fault fixture (stale_cursor)", async () => {
    const mock = new MockEventStream(FAULT_PATH, "stale_cursor");
    await assert.rejects(async () => {
      await mock.publish({ type: "X", data: {} });
    }, (err: any) => err.code === "STALE_REVISION" && err.message.includes("cursor is stale"));
  });
});