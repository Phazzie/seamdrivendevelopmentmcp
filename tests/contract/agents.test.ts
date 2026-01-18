import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import path from "path";
import type { IAgentRegistry } from "../../contracts/agents.contract.js";
import { MockAgentRegistry } from "../../src/lib/mocks/agents.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "agents", "local_user.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "agents", "fault.json");

export function runAgentContractTests(createRegistry: () => Promise<IAgentRegistry>) {
  describe("Agent Registry Contract", () => {
    let registry: IAgentRegistry;

    beforeEach(async () => {
      registry = await createRegistry();
    });

    it("should register and resolve an agent", async () => {
      const agent = await registry.register("Codex");
      assert.ok(agent.id);
      assert.strictEqual(agent.name, "Codex");

      const resolved = await registry.resolve(agent.id);
      assert.strictEqual(resolved.id, agent.id);
    });

    it("should list agents", async () => {
      const agent = await registry.register("Gemini");
      const list = await registry.list();
      assert.ok(list.find((entry) => entry.id === agent.id));
    });

    it("should update lastSeenAt on touch", async () => {
      const agent = await registry.register("Codex");
      const touched = await registry.touch(agent.id);
      assert.ok(touched.lastSeenAt >= agent.lastSeenAt);
    });
  });
}

describe("MockAgentRegistry", () => {
  runAgentContractTests(async () => new MockAgentRegistry(FIXTURE_PATH));

  it("should fail when loading fault fixture (name_conflict)", async () => {
    const mock = new MockAgentRegistry(FAULT_PATH, "name_conflict");
    await assert.rejects(async () => {
      await mock.register("Any");
    }, (err: any) => err.code === "VALIDATION_FAILED" && err.message.includes("already registered"));
  });
});