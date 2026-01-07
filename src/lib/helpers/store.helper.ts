/**
 * Purpose: Shared logic for atomic store transactions (persistence seam).
 */
import { AppError } from "../../../contracts/store.contract.js";
import type { IStore, PersistedStore } from "../../../contracts/store.contract.js";

export async function runTransaction<T>(
  store: IStore,
  operation: (current: PersistedStore) => { nextState: PersistedStore; result: T },
  errorMessage: string = "Transaction failed after max retries"
): Promise<T> {
  const MAX_RETRIES = 5;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const current = await store.load();
      const { nextState, result } = operation(current);
      await store.update(() => nextState, current.revision);
      return result;
    } catch (err: any) {
      if (err.code === "STALE_REVISION") {
        attempt++;
        continue;
      }
      throw err;
    }
  }
  throw new AppError("INTERNAL_ERROR", errorMessage);
}
