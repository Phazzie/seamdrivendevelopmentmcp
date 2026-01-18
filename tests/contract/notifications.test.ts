import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import path from "path";
import type { INotificationCenter } from "../../contracts/notifications.contract.js";
import { MockNotificationCenter } from "../../src/lib/mocks/notifications.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "notifications", "sample.json");
const FAULT_PATH = path.join(process.cwd(), "fixtures", "notifications", "fault.json");

export function runNotificationContractTests(createCenter: () => Promise<INotificationCenter>) {
  describe("Notification Center Contract", () => {
    let center: INotificationCenter;

    beforeEach(async () => {
      center = await createCenter();
    });

    it("should load fixture notifications when present", async () => {
      const list = await center.list();
      assert.ok(Array.isArray(list));
    });
  });
}

describe("MockNotificationCenter", () => {
  runNotificationContractTests(async () => new MockNotificationCenter(FIXTURE_PATH));

  it("should fail when loading fault fixture (invalid_priority)", async () => {
    const mock = new MockNotificationCenter(FAULT_PATH, "invalid_priority");
    await assert.rejects(async () => {
      await mock.send({ title: "X", message: "X", priority: "none" as any });
    }, (err: any) => err.code === "VALIDATION_FAILED" && err.message.includes("Invalid notification priority"));
  });
});