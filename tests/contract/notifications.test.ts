/**
 * Purpose: Verify notifications contract compliance.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import type { INotificationCenter, Notification } from "../../contracts/notifications.contract.js";
import { MockNotificationCenter } from "../../src/lib/mocks/notifications.mock.js";
import { NotificationAdapter } from "../../src/lib/adapters/notifications.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "notifications", "sample.json");

function loadFixtureNotifications(): Notification[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as { notifications?: Notification[] };
  return Array.isArray(parsed.notifications) ? parsed.notifications : [];
}

export function runNotificationContractTests(createCenter: () => Promise<INotificationCenter>) {
  describe("Notification Center Contract", () => {
    let center: INotificationCenter;

    beforeEach(async () => {
      center = await createCenter();
    });

    it("should load fixture notifications when present", async () => {
      const fixture = loadFixtureNotifications();
      const list = await center.list();
      assert.strictEqual(list.length, fixture.length);
      if (list.length) {
        assert.strictEqual(list[0].priority, "urgent");
      }
    });

    it("should send notifications with default priority", async () => {
      const notification = await center.send({
        title: "Default priority",
        message: "This should be normal priority.",
      });
      assert.strictEqual(notification.priority, "normal");
    });

    it("should filter by min priority", async () => {
      const highPriority = await center.list({ minPriority: "high" });
      assert.ok(highPriority.every((n) => n.priority === "high" || n.priority === "urgent"));
    });
  });
}

describe("MockNotificationCenter", () => {
  runNotificationContractTests(async () => new MockNotificationCenter());
});

describe("NotificationAdapter", () => {
  runNotificationContractTests(async () => {
    const fixture = loadFixtureNotifications();
    const store = new MockStore(undefined, { notifications: fixture });
    return new NotificationAdapter(store);
  });
});
