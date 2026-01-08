/**
 * Purpose: Mock implementation for confidence_auction using fixtures.
 */
import fs from "fs";
import path from "path";
import {
  ConfidenceAuctionFixture,
  ConfidenceAuctionFixtureSchema,
  ConfidenceAuctionInput,
  ConfidenceAuctionResult,
  IConfidenceAuction,
} from "../../../contracts/confidence_auction.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "confidence_auction", "default.json");
const DEFAULT_SCENARIO = "basic";

type MockOptions = {
  scenario?: string;
};

function loadFixture(fixturePath: string): ConfidenceAuctionFixture {
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Confidence auction fixture not found: ${fixturePath}`);
  }
  const raw = fs.readFileSync(fixturePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const result = ConfidenceAuctionFixtureSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid confidence auction fixture: ${result.error.message}`);
  }
  return result.data;
}

export class MockConfidenceAuction implements IConfidenceAuction {
  private scenario: string;
  private fixture: ConfidenceAuctionFixture;

  constructor(options: MockOptions = {}, fixturePath: string = FIXTURE_PATH) {
    this.scenario = options.scenario ?? DEFAULT_SCENARIO;
    this.fixture = loadFixture(fixturePath);
  }

  async resolve(input: ConfidenceAuctionInput): Promise<ConfidenceAuctionResult> {
    const scenario = this.fixture.scenarios[this.scenario];
    if (!scenario) {
      throw new Error(`Unknown confidence auction scenario: ${this.scenario}`);
    }
    if (JSON.stringify(scenario.input) !== JSON.stringify(input)) {
      throw new Error("Confidence auction input does not match fixture scenario.");
    }
    return JSON.parse(JSON.stringify(scenario.expected)) as ConfidenceAuctionResult;
  }
}
