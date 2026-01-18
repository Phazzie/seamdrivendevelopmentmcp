import { describe, it } from "node:test";
import assert from "node:assert";
import path from "path";
import { runLockerContractTests } from "./locker.test.js";
import { LockerAdapter } from "../../src/lib/adapters/locker.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";

import { AppError } from "../../contracts/store.contract.js";

describe("Real LockerAdapter (with MockStore)", () => {
  runLockerContractTests(async () => {
    const store = new MockStore();
    return new LockerAdapter(store);
  });

  it("should block acquisition when panic mode is enabled", async () => {
    const store = new MockStore();
    const locker = new LockerAdapter(store);

    await store.update((c) => { c.panic_mode = true; return c; }, 1);

    await assert.rejects(async () => {
      await locker.acquire(["res1"], "owner1", 1000);
    }, (err: any) => err.code === "PANIC_MODE");
  });

  it("should block acquisition when a review gate is pending", async () => {
    const store = new MockStore();
    const locker = new LockerAdapter(store);

    await store.update((c) => { 
      c.review_gates = [{
        id: "gate-1",
        planId: "plan-1",
        status: "pending",
        plan: "Destroy world",
        affectedResources: [path.resolve("res1")], 
        created_at: Date.now(),
        updated_at: Date.now()
      }]; 
      return c; 
    }, 1);

    await assert.rejects(async () => {
      await locker.acquire(["res1"], "owner1", 1000);
    }, (err: any) => err.code === "LOCKED" && err.message.includes("blocked by pending Review Gates"));
  });
});