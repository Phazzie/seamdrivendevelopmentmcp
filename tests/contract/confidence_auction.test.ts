/**
 * Purpose: Verify confidence_auction contract compliance.
 */
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { MockConfidenceAuction } from "../../src/lib/mocks/confidence_auction.mock.js";
import { ConfidenceAuctionAdapter } from "../../src/lib/adapters/confidence_auction.adapter.js";
import {
  ConfidenceAuctionFixtureSchema,
  ConfidenceAuctionResultSchema,
} from "../../contracts/confidence_auction.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "confidence_auction", "default.json");

test("Confidence Auction Contract - Mock", async () => {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const fixture = ConfidenceAuctionFixtureSchema.parse(JSON.parse(raw));
  const scenario = fixture.scenarios.basic;

  const mock = new MockConfidenceAuction({ scenario: "basic" }, FIXTURE_PATH);
  const result = await mock.resolve(scenario.input);

  assert.deepStrictEqual(result, scenario.expected);
  assert.doesNotThrow(() => ConfidenceAuctionResultSchema.parse(result));
});

test("Confidence Auction Contract - Adapter", async () => {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const fixture = ConfidenceAuctionFixtureSchema.parse(JSON.parse(raw));
  const scenario = fixture.scenarios.basic;

  const adapter = new ConfidenceAuctionAdapter();
  const result = await adapter.resolve(scenario.input);

  assert.deepStrictEqual(result, scenario.expected);
  assert.doesNotThrow(() => ConfidenceAuctionResultSchema.parse(result));
});
