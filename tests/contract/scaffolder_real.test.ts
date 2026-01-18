// Purpose: Verify Scaffolder adapter against contract (scaffolder seam).
import { after, before, describe } from "node:test";
import fs from "fs";
import os from "os";
import path from "path";
import { ScaffolderAdapter } from "../../src/lib/adapters/scaffolder.adapter.js";
import { PathGuard } from "../../src/lib/helpers/path_guard.js";
import { runScaffolderContractTests } from "./scaffolder.test.js";

describe("Real ScaffolderAdapter", () => {
  let tempDir = "";
  // Jail to temp for tests
  const pathGuard = new PathGuard(os.tmpdir());

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-"));
  });

  after(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  runScaffolderContractTests(async () => new ScaffolderAdapter(pathGuard));
});