import { describe } from "node:test";
import { runStatusContractTests } from "./status.test.js";
import { StatusAdapter } from "../../src/lib/adapters/status.adapter.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";

describe("Real StatusAdapter (with MockStore)", () => {
  runStatusContractTests(async () => {
    const store = new MockStore();
    return new StatusAdapter(store);
  });
});
