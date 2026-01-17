import { describe } from "node:test";
import fs from "fs";
import path from "path";
import { runMessageContractTests } from "./messages.test.js";
import { MessageAdapter } from "../../src/lib/adapters/messages.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";
import type { Message } from "../../contracts/messages.contract.js";

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

describe("Real MessageAdapter (with MockStore)", () => {
  runMessageContractTests(async () => {
    const fixtureRevision = loadFixtureRevision();
    const store = new MockStore(undefined, {
      messages: loadFixtureMessages(),
      revision: typeof fixtureRevision === "number" ? fixtureRevision : 1,
    });
    return new MessageAdapter(store);
  });
});
