import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import path from "path";
import type { IAuditLog } from "../../contracts/audit.contract.js";
import { MockAuditLog } from "../../src/lib/mocks/audit.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "audit", "sample.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "audit", "fault.json");

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
  runAuditContractTests(async () => new MockAuditLog(FIXTURE_PATH));

  it("should fail when loading fault fixture (read_denied)", async () => {
    const mock = new MockAuditLog(FAULT_PATH, "read_denied");
    await assert.rejects(async () => {
      await mock.list();
    }, (err: any) => err.code === "INTERNAL_ERROR" && err.message.includes("Permission denied"));
  });
});