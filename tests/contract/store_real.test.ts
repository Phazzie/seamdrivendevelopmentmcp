import { describe } from "node:test";
import path from "path";
import fs from "fs";
import { runStoreContractTests } from "./store.test.js"; // Reuse the contract suite
import { StoreAdapter } from "../../src/lib/adapters/store.adapter.js";

describe("Real StoreAdapter Implementation", () => {
  const TEST_DIR = path.join(process.cwd(), "tests/tmp");
  const TEST_FILE = path.join(TEST_DIR, "real_store.json");

  // Setup/Teardown
  if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });

  runStoreContractTests(async () => {
    // Clean slate for each test
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
    return new StoreAdapter(TEST_FILE);
  });
});
