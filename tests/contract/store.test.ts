import { test, describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { MockStore } from "../../src/lib/mocks/store.mock.js";
import type { IStore } from "../../contracts/store.contract.js";

// Reusable test suite that can run against ANY IStore implementation
export function runStoreContractTests(createStore: () => Promise<IStore>) {
  
  describe("Store Contract", () => {
    let store: IStore;

    beforeEach(async () => {
      store = await createStore();
    });

    it("should load default state", async () => {
      const data = await store.load();
      assert.strictEqual(data.schemaVersion, 1);
      assert.strictEqual(data.revision, 1);
      assert.ok(Array.isArray(data.agents));
      assert.ok(Array.isArray(data.audit));
    });

    it("should atomic update successfully", async () => {
      const initial = await store.load();
      
      const updated = await store.update((current) => {
        current.panic_mode = true;
        return current;
      }, initial.revision);

      assert.strictEqual(updated.panic_mode, true);
      assert.strictEqual(updated.revision, initial.revision + 1);
    });

    it("should emit change event on update", async () => {
      const initial = await store.load();
      let eventFired = false;
      let newRevision = -1;

      store.on('change', (rev) => {
        eventFired = true;
        newRevision = rev;
      });

      await store.update((c) => c, initial.revision);

      assert.strictEqual(eventFired, true);
      assert.strictEqual(newRevision, initial.revision + 1);
    });

    it("should reject stale revision updates", async () => {
      const initial = await store.load();

      // First update succeeds
      await store.update((c) => c, initial.revision);

      // Second update with OLD revision should fail
      await assert.rejects(async () => {
        await store.update((c) => c, initial.revision);
      }, (err: any) => {
        assert.strictEqual(err.code, "STALE_REVISION");
        return true;
      });
    });
  });
}

// Run against Mock
describe("MockStore Implementation", () => {
  runStoreContractTests(async () => new MockStore());
});
