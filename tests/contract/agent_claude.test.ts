/**
 * Purpose: Verify Agent Identity mechanics and strict name validation (agent_identity seam).
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { MockAgentRegistry } from "../../src/lib/mocks/agents.mock.js";
import { AgentAdapter } from "../../src/lib/adapters/agents.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";

function runAgentContractTests(createRegistry: () => Promise<any>) {
  describe("Agent Identity Contract", () => {
    let agents: any;

    beforeEach(async () => {
      agents = await createRegistry();
    });

    it("allows registering 'Claude'", async () => {
      const agent = await agents.register("Claude");
      assert.strictEqual(agent.name, "Claude");
      assert.ok(agent.id);
    });

    it("allows registering 'Gemini'", async () => {
      const agent = await agents.register("Gemini");
      assert.strictEqual(agent.name, "Gemini");
    });

    it("rejects unknown agents (e.g. 'ChatGPT')", async () => {
      await assert.rejects(
        async () => await agents.register("ChatGPT"),
        (err: any) => {
          // Zod error or validation failed
          return true; 
        }
      );
    });
  });
}

describe("MockAgentRegistry", () => {
  runAgentContractTests(async () => new MockAgentRegistry());
});

describe("AgentAdapter (Real)", () => {
  runAgentContractTests(async () => {
    const store = new MockStore({});
    return new AgentAdapter(store);
  });
});
