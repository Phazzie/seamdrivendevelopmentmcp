import { describe } from "node:test";
import { runAuditContractTests } from "./audit.test.js";
import { AuditAdapter } from "../../src/lib/adapters/audit.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";

describe("Real AuditAdapter (with MockStore)", () => {
  runAuditContractTests(async () => {
    const store = new MockStore();
    return new AuditAdapter(store);
  });
});
