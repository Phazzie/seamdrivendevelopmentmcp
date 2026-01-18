import { IStore } from "../../../contracts/store.contract.js";

/**
 * Purpose: Convert store revision pulses into an AsyncIterable stream (helpers seam).
 * Hardened: Non-blocking, timeout-aware.
 */
export async function* createRevisionStream(
  store: IStore, 
  timeoutMs = 5000
): AsyncIterable<number> {
  let lastKnownRevision = 0;

  // Initial fetch
  const initial = await store.load();
  lastKnownRevision = initial.revision;
  yield lastKnownRevision;

  while (true) {
    const nextRevision = await store.waitForRevision(lastKnownRevision, timeoutMs);
    
    if (nextRevision > lastKnownRevision) {
      lastKnownRevision = nextRevision;
      yield lastKnownRevision;
    } else {
      // Periodic "Heartbeat" even if no revision changed
      yield lastKnownRevision;
    }
  }
}
