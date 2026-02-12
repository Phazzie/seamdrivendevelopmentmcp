import { describe, it } from "node:test";
import assert from "node:assert";
import { AppError } from "../../contracts/store.contract.js";
import type { IStore, PersistedStore } from "../../contracts/store.contract.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";
import { MetaProvider } from "../../src/lib/providers/meta.provider.js";
import { ReviewGateAdapter } from "../../src/lib/adapters/review_gate.adapter.js";
import { ArbitrationAdapter } from "../../src/lib/adapters/arbitration.adapter.js";
import { MoodAdapter } from "../../src/lib/adapters/mood.adapter.js";
import { ConfidenceAuctionAdapter } from "../../src/lib/adapters/confidence_auction.adapter.js";

class FlakyStore implements IStore {
  private failOnUpdateCount = 0;

  constructor(private readonly inner: IStore) {}

  failNextUpdate(): void {
    this.failOnUpdateCount += 1;
  }

  async load(): Promise<PersistedStore> {
    return this.inner.load();
  }

  async update(
    updater: (current: PersistedStore) => PersistedStore,
    expectedRevision: number
  ): Promise<PersistedStore> {
    if (this.failOnUpdateCount > 0) {
      this.failOnUpdateCount -= 1;
      throw new AppError("STALE_REVISION", "Injected stale revision for retry test");
    }
    return this.inner.update(updater, expectedRevision);
  }

  async waitForRevision(sinceRevision: number, timeoutMs: number): Promise<number> {
    return this.inner.waitForRevision(sinceRevision, timeoutMs);
  }
}

describe("MetaProvider panic-mode handlers", () => {
  it("retries panic state updates after stale revision errors", async () => {
    const store = new FlakyStore(new MockStore());
    const provider = new MetaProvider(
      new ReviewGateAdapter(store),
      new ArbitrationAdapter(store),
      new MoodAdapter(store),
      new ConfidenceAuctionAdapter(),
      store
    );

    const handlers = provider.getHandlers();

    store.failNextUpdate();
    await handlers.trigger_panic({ reason: "emergency" });
    const afterTrigger = await store.load();
    assert.strictEqual(afterTrigger.panic_mode, true);

    store.failNextUpdate();
    await handlers.resolve_panic({});
    const afterResolve = await store.load();
    assert.strictEqual(afterResolve.panic_mode, false);
  });
});
