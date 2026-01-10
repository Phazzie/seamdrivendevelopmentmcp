// Purpose: Verify Idea adapter against contract (ideas seam).
import { describe } from "node:test";
import fs from "fs";
import path from "path";
import { runIdeaContractTests } from "./ideas.test.js";
import { IdeaAdapter } from "../../src/lib/adapters/ideas.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";
import type { Idea } from "../../contracts/ideas.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "ideas", "sample.json");

type IdeaScenarioOutputs = {
  list: Idea[];
};

function loadFixtureIdeas(): Idea[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as { scenarios?: Record<string, { outputs?: IdeaScenarioOutputs }> };
  return parsed.scenarios?.success?.outputs?.list ?? [];
}

describe("Real IdeaAdapter (with MockStore)", () => {
  runIdeaContractTests(async () => {
    const store = new MockStore({ ideas: loadFixtureIdeas() });
    return new IdeaAdapter(store);
  });
});
