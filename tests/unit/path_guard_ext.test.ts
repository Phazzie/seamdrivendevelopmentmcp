import { describe, it } from "node:test";
import assert from "node:assert";
import path from "path";
import os from "os";
import fs from "fs";
import { PathGuard } from "../../src/lib/helpers/path_guard.js";

describe("PathGuard with External Roots", () => {
  const root = process.cwd();
  const tmpBase = os.tmpdir();
  const extDir = path.join(tmpBase, `mcp-test-${Date.now()}`);

  if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true });

  it("should block external paths by default", async () => {
    const pg = new PathGuard(root);
    const extFile = path.join(extDir, "test.json");
    
    try {
      await pg.validate(extFile);
      assert.fail("Should have thrown security violation");
    } catch (err: any) {
      assert.match(err.message, /SECURITY VIOLATION/);
    }
  });

  it("should allow external paths if whitelisted", async () => {
    const pg = new PathGuard(root, [extDir]);
    const extFile = path.join(extDir, "test.json");
    
    const validated = await pg.validate(extFile);
    assert.strictEqual(validated, path.resolve(extFile));
  });

  it("should allow subdirectories of whitelisted external roots", async () => {
    const pg = new PathGuard(root, [extDir]);
    const subFile = path.join(extDir, "data", "shard.json");
    
    const validated = await pg.validate(subFile);
    assert.strictEqual(validated, path.resolve(subFile));
  });

  it("should block sibling-prefix escape paths", async () => {
    const pg = new PathGuard(root);
    const siblingPath = `${root}-evil/proof.txt`;

    await assert.rejects(
      async () => pg.validate(siblingPath),
      (err: any) => /SECURITY VIOLATION/.test(err.message)
    );
  });

  it("should block symlink escape paths", async () => {
    if (process.platform === "win32") return;

    const workDir = path.join(root, "tests", "tmp", `pg-ext-${Date.now()}`);
    const linkPath = path.join(workDir, "escape-link");
    fs.mkdirSync(workDir, { recursive: true });
    try {
      fs.symlinkSync(tmpBase, linkPath);
      const target = path.join(linkPath, "pg-escape-proof.txt");
      const pg = new PathGuard(root);

      await assert.rejects(
        async () => pg.validate(target),
        (err: any) => /SECURITY VIOLATION/.test(err.message)
      );
    } finally {
      if (fs.existsSync(linkPath)) fs.unlinkSync(linkPath);
      if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true });
    }
  });

  it("should reject allowlisted roots that canonicalize to critical roots", (t) => {
    if (process.platform === "win32") return;

    const workDir = path.join(root, "tests", "tmp", `pg-allow-${Date.now()}`);
    const linkPath = path.join(workDir, "root-link");
    fs.mkdirSync(workDir, { recursive: true });

    try {
      try {
        fs.symlinkSync("/", linkPath);
      } catch (err: any) {
        if (err?.code === "EPERM" || err?.code === "EACCES") {
          t.skip("Symlink creation is not permitted in this environment");
          return;
        }
        throw err;
      }

      assert.throws(
        () => new PathGuard(root, [linkPath]),
        /SECURITY VIOLATION/
      );
    } finally {
      if (fs.existsSync(linkPath)) fs.unlinkSync(linkPath);
      if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true });
    }
  });
});
