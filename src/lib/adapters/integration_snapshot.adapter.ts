// Purpose: read integration snapshot from store (integration_snapshot seam).
import type { IStore } from "../../../contracts/store.contract.js";
import type {
  IIntegrationSnapshotReader,
  IntegrationSnapshot,
} from "../../../contracts/integration_snapshot.contract.js";

export class IntegrationSnapshotAdapter implements IIntegrationSnapshotReader {
  constructor(
    private readonly store: IStore,
    private readonly storePath: string
  ) {}

  async getSnapshot(): Promise<IntegrationSnapshot> {
    const data = await this.store.load();
    return {
      captured_at: new Date().toISOString(),
      store_path: this.storePath,
      store: data,
    };
  }
}
