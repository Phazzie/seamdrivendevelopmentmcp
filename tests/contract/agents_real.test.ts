import { describe } from "node:test";
import { runAgentContractTests } from "./agents.test.js";
import { AgentAdapter } from "../../src/lib/adapters/agents.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";

describe("Real AgentAdapter (with MockStore)", () => {
  runAgentContractTests(async () => {
    const store = new MockStore();
    return new AgentAdapter(store);
  });
});
