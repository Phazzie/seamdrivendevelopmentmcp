// Purpose: define integration snapshot contract (integration_snapshot seam).
import { z } from "zod";
import { PersistedStoreSchema } from "./store.contract.js";

export const IntegrationSnapshotSchema = z.object({
  captured_at: z.string(),
  store_path: z.string(),
  store: PersistedStoreSchema,
});

export type IntegrationSnapshot = z.infer<typeof IntegrationSnapshotSchema>;

export interface IIntegrationSnapshotReader {
  getSnapshot(): Promise<IntegrationSnapshot>;
}
