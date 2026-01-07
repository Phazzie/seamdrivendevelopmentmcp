import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import type { ILocker } from "../../contracts/locker.contract.js";
import { MockLocker } from "../../src/lib/mocks/locker.mock.js";

type NormalizationStrategy = "lowercase" | "none";

const NORMALIZATION_FIXTURE = path.join(process.cwd(), "fixtures", "locker", "capabilities.json");

function loadNormalizationStrategy(): NormalizationStrategy {
  if (!fs.existsSync(NORMALIZATION_FIXTURE)) return "none";
  const raw = fs.readFileSync(NORMALIZATION_FIXTURE, "utf-8");
  const data = JSON.parse(raw) as { normalization_strategy?: NormalizationStrategy };
  return data.normalization_strategy === "lowercase" ? "lowercase" : "none";
}

function normalizeResource(resource: string): string {
  const strategy = loadNormalizationStrategy();
  const resolved = path.resolve(resource);
  return strategy === "lowercase" ? resolved.toLowerCase() : resolved;
}

export function runLockerContractTests(createLocker: () => Promise<ILocker>) {
  describe("Locker Contract", () => {
    let locker: ILocker;

    beforeEach(async () => {
      locker = await createLocker();
    });

    it("should acquire locks atomically", async () => {
      const locks = await locker.acquire(["res1", "res2"], "owner1", 1000);
      assert.strictEqual(locks.length, 2);
      
      const list = await locker.list();
      assert.strictEqual(list.length, 2);
    });

    it("should fail if any resource is locked by another", async () => {
      await locker.acquire(["res1"], "owner1", 1000);

      // owner2 tries to get res1 + res2
      await assert.rejects(async () => {
        await locker.acquire(["res1", "res2"], "owner2", 1000);
      }, (err: any) => err.code === "LOCKED");

      // Verify res2 was NOT locked (Atomic failure)
      const list = await locker.list();
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0].resource, normalizeResource("res1"));
    });

    it("should allow re-entrancy (same owner)", async () => {
      await locker.acquire(["res1"], "owner1", 1000);
      
      // Same owner requests again
      const locks = await locker.acquire(["res1"], "owner1", 2000);
      assert.strictEqual(locks.length, 1);
      
      // Expiration should be updated
      const list = await locker.list();
      assert.ok(list[0].expiresAt > Date.now() + 1500);
    });

    it("should renew locks for owner", async () => {
      const locks = await locker.acquire(["res1"], "owner1", 1000);
      const originalExpiry = locks[0].expiresAt;

      const renewed = await locker.renew(["res1"], "owner1", 2000);
      assert.ok(renewed[0].expiresAt > originalExpiry);
    });

    it("should normalize resources based on fixture", async () => {
      const strategy = loadNormalizationStrategy();
      const mixed = "Res1";
      const lower = "res1";

      await locker.acquire([mixed], "owner1", 1000);

      if (strategy === "lowercase") {
        await assert.rejects(async () => {
          await locker.acquire([lower], "owner2", 1000);
        }, (err: any) => err.code === "LOCKED");
      } else {
        const locks = await locker.acquire([lower], "owner2", 1000);
        assert.strictEqual(locks.length, 1);
      }
    });

    it("should ignore expired locks", async () => {
      await locker.acquire(["res1"], "owner1", -100); // Already expired

      // owner2 should succeed
      const locks = await locker.acquire(["res1"], "owner2", 1000);
      assert.strictEqual(locks.length, 1);
      assert.strictEqual(locks[0].ownerId, "owner2");
    });
  });
}

describe("MockLocker Implementation", () => {
  runLockerContractTests(async () => new MockLocker());
});
