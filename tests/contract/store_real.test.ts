import { describe, after } from "node:test";
import path from "path";
import fs from "fs";
import { runStoreContractTests } from "./store.test.js"; 
import { StoreAdapter } from "../../src/lib/adapters/store.adapter.js";
import { JailedFs } from "../../src/lib/helpers/jailed_fs.js";

describe("Real StoreAdapter Implementation", () => {
  const TEST_DIR = path.join(process.cwd(), "tests/tmp");
  const TEST_FILE = path.join(TEST_DIR, "real_store.json");
  const jailedFs = new JailedFs(process.cwd());

  if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });

  after(() => {
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
  });

  runStoreContractTests(async () => {
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
    return new StoreAdapter(TEST_FILE, jailedFs);
  });
});
