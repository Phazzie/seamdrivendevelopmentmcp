import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { IAuditLog } from "../../contracts/audit.contract.js";
import { MockAuditLog } from "../../src/lib/mocks/audit.mock.js";

export function runAuditContractTests(createLog: () => Promise<IAuditLog>) {
  describe("Audit Log Contract", () => {
    let audit: IAuditLog;

    beforeEach(async () => {
      audit = await createLog();
    });

    it("should record audit events", async () => {
      const event = await audit.record("agent-1", "create_task", "{\"title\":\"t\"}", "{\"id\":\"1\"}");
      assert.ok(event.id);
      assert.strictEqual(event.agentId, "agent-1");
      assert.strictEqual(event.tool, "create_task");
    });

    it("should list audit events with filters", async () => {
      await audit.record("agent-1", "create_task", "{}", "{}");
      await audit.record("agent-2", "post_message", "{}", "{}");

      const byAgent = await audit.list({ agentId: "agent-1" });
      assert.ok(byAgent.every((event) => event.agentId === "agent-1"));

      const byTool = await audit.list({ tool: "post_message" });
      assert.ok(byTool.every((event) => event.tool === "post_message"));
    });
  });
}

describe("MockAuditLog", () => {
  runAuditContractTests(async () => new MockAuditLog());
});
