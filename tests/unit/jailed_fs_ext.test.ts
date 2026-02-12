import { describe, it } from "node:test";
import assert from "node:assert";
import path from "path";
import os from "os";
import fs from "fs";
import { JailedFs } from "../../src/lib/helpers/jailed_fs.js";

describe("JailedFs with External Roots", () => {
  const root = process.cwd();
  const tmpBase = os.tmpdir();
  const extDir = path.join(tmpBase, `mcp-test-jfs-${Date.now()}`);

  if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true });

  it("should block external paths by default", async () => {
    const jfs = new JailedFs(root);
    const extFile = path.join(extDir, "test.json");
    
    try {
      await jfs.readFile(extFile);
      assert.fail("Should have thrown security violation");
    } catch (err: any) {
      assert.match(err.message, /SECURITY VIOLATION/);
    }
  });

  it("should allow external paths if whitelisted", async () => {
    const jfs = new JailedFs(root, [extDir]);
    const extFile = path.join(extDir, "test.json");
    fs.writeFileSync(extFile, "hello");
    
    const content = await jfs.readFile(extFile);
    assert.strictEqual(content, "hello");
    
    fs.unlinkSync(extFile);
  });

  it("should allow exists check on whitelisted external paths", () => {
    const jfs = new JailedFs(root, [extDir]);
    const extFile = path.join(extDir, "test.json");
    
    assert.strictEqual(jfs.exists(extFile), false);
    fs.writeFileSync(extFile, "hello");
    assert.strictEqual(jfs.exists(extFile), true);
    
    fs.unlinkSync(extFile);
  });

  it("should block sibling-prefix escape paths", async () => {
    const jfs = new JailedFs(root);
    const siblingPath = `${root}-evil/proof.txt`;

    await assert.rejects(
      async () => jfs.readFile(siblingPath),
      (err: any) => /SECURITY VIOLATION/.test(err.message)
    );
  });

  it("should block symlink escape writes", async () => {
    if (process.platform === "win32") return;

    const workDir = path.join(root, "tests", "tmp", `jfs-ext-${Date.now()}`);
    const linkPath = path.join(workDir, "escape-link");
    const escapedFile = path.join(tmpBase, `jfs-escape-${Date.now()}.txt`);
    fs.mkdirSync(workDir, { recursive: true });

    try {
      fs.symlinkSync(tmpBase, linkPath);
      const escapedPathViaLink = path.join(linkPath, path.basename(escapedFile));
      const jfs = new JailedFs(root);

      await assert.rejects(
        async () => jfs.writeFile(escapedPathViaLink, "proof"),
        (err: any) => /SECURITY VIOLATION/.test(err.message)
      );
      assert.strictEqual(fs.existsSync(escapedFile), false);
    } finally {
      if (fs.existsSync(escapedFile)) fs.unlinkSync(escapedFile);
      if (fs.existsSync(linkPath)) fs.unlinkSync(linkPath);
      if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true });
    }
  });

  it("should reject allowlisted roots that canonicalize to critical roots", (t) => {
    if (process.platform === "win32") return;

    const workDir = path.join(root, "tests", "tmp", `jfs-allow-${Date.now()}`);
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
        () => new JailedFs(root, [linkPath]),
        /SECURITY VIOLATION/
      );
    } finally {
      if (fs.existsSync(linkPath)) fs.unlinkSync(linkPath);
      if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true });
    }
  });
});
