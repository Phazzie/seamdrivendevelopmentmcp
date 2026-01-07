import { describe, it } from "node:test";
import assert from "node:assert";
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

    // Enable Panic Mode manually in store
    await store.update((c) => { c.panic_mode = true; return c; }, 1);

    await assert.rejects(async () => {
      await locker.acquire(["res1"], "owner1", 1000);
    }, (err: any) => err.code === "PANIC_MODE");
  });
});
