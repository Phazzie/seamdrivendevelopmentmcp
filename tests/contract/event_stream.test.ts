/**
 * Purpose: Verify event_stream contract compliance.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import type { Event, IEventStream } from "../../contracts/event_stream.contract.js";
import { MockEventStream } from "../../src/lib/mocks/event_stream.mock.js";
import { EventStreamAdapter } from "../../src/lib/adapters/event_stream.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "event_stream", "sample.json");

function loadFixtureEvents(): Event[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as { events?: Event[] };
  return Array.isArray(parsed.events) ? parsed.events : [];
}

export function runEventStreamContractTests(createStream: () => Promise<IEventStream>) {
  describe("Event Stream Contract", () => {
    let stream: IEventStream;

    beforeEach(async () => {
      stream = await createStream();
    });

    it("should load fixture events when present", async () => {
      const fixtureEvents = loadFixtureEvents();
      const list = await stream.list();
      assert.strictEqual(list.length, fixtureEvents.length);
      if (fixtureEvents.length) {
        assert.strictEqual(list[0].id, fixtureEvents[0].id);
      }
    });

    it("should publish and filter events", async () => {
      await stream.publish({ type: "review", data: { status: "requested" } });
      const list = await stream.list({ type: "review" });
      assert.ok(list.length >= 1);
      assert.ok(list.find((event) => event.type === "review"));
    });

    it("should wait for new events", async () => {
      const existing = await stream.list();
      const since = existing.length ? existing[existing.length - 1].timestamp : 0;
      const waitPromise = stream.waitForEvents({ since, timeoutMs: 500 });

      setTimeout(() => {
        stream.publish({ type: "signal", data: { ping: true } });
      }, 50);

      const result = await waitPromise;
      assert.ok(result);
      assert.ok(result!.some((event) => event.type === "signal"));
    });
  });
}

describe("MockEventStream", () => {
  runEventStreamContractTests(async () => new MockEventStream());
});

describe("EventStreamAdapter", () => {
  runEventStreamContractTests(async () => {
    const fixtureEvents = loadFixtureEvents();
    const store = new MockStore({ events: fixtureEvents });
    return new EventStreamAdapter(store);
  });
});
