import fs from "fs/promises";
import { existsSync, realpathSync } from "fs";
import path from "path";

const DENIED_CRITICAL_ROOTS = new Set(["/", "/Users", "/home"]);

/**
 * Purpose: A hardened, path-aware wrapper for Node FS (helpers seam).
 * Hardened: Automatically prepends root, validates boundaries, prevents symlink escapes.
 */
export class JailedFs {
  private readonly allowedRoots: string[];

  constructor(rootDir: string, extraAllowed: string[] = []) {
    this.allowedRoots = [
      this.resolveAndValidateAllowedRoot(rootDir),
      ...extraAllowed.map((p) => this.resolveAndValidateAllowedRoot(p)),
    ];
  }

  private async resolveAndValidate(targetPath: string): Promise<string> {
    const resolved = path.resolve(this.allowedRoots[0], targetPath);
    if (!this.isWithinAllowedRoots(resolved)) {
      throw new Error(
        `SECURITY VIOLATION: Path traversal blocked. Target: ${targetPath}`
      );
    }
    await this.assertNoSymlinkEscape(resolved);
    return resolved;
  }

  async readFile(
    filePath: string,
    encoding: BufferEncoding = "utf-8"
  ): Promise<string> {
    const safePath = await this.resolveAndValidate(filePath);
    return fs.readFile(safePath, encoding);
  }

  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    const safePath = await this.resolveAndValidate(filePath);
    const dir = path.dirname(safePath);
    if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true });
    return fs.writeFile(safePath, content);
  }

  async mkdir(dirPath: string): Promise<void> {
    const safePath = await this.resolveAndValidate(dirPath);
    await fs.mkdir(safePath, { recursive: true });
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const safeOld = await this.resolveAndValidate(oldPath);
    const safeNew = await this.resolveAndValidate(newPath);
    return fs.rename(safeOld, safeNew);
  }

  async unlink(filePath: string): Promise<void> {
    const safePath = await this.resolveAndValidate(filePath);
    return fs.unlink(safePath);
  }

  async readdir(dirPath: string): Promise<string[]> {
    const safePath = await this.resolveAndValidate(dirPath);
    return fs.readdir(safePath);
  }

  async stat(filePath: string) {
    const safePath = await this.resolveAndValidate(filePath);
    return fs.stat(safePath);
  }

  async open(filePath: string, flags: string) {
    const safePath = await this.resolveAndValidate(filePath);
    return fs.open(safePath, flags);
  }

  exists(filePath: string): boolean {
    // Note: Sync check for path-resolution only
    const resolved = path.resolve(this.allowedRoots[0], filePath);
    if (!this.isWithinAllowedRoots(resolved)) return false;

    const existingAnchor = this.findNearestExistingPath(resolved);
    if (existingAnchor) {
      try {
        const realAnchor = realpathSync(existingAnchor);
        if (!this.isWithinAllowedRoots(realAnchor)) return false;
      } catch {
        return false;
      }
    }

    return existsSync(resolved);
  }

  getRootDir(): string {
    return this.allowedRoots[0];
  }

  private isWithinAllowedRoots(targetPath: string): boolean {
    return this.allowedRoots.some((root) => {
      if (this.isWithinRoot(root, targetPath)) return true;
      if (!existsSync(root)) return false;
      try {
        const canonicalRoot = realpathSync(root);
        return this.isWithinRoot(canonicalRoot, targetPath);
      } catch {
        return false;
      }
    });
  }

  private isWithinRoot(root: string, targetPath: string): boolean {
    const relative = path.relative(root, targetPath);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  }

  private async assertNoSymlinkEscape(resolvedPath: string): Promise<void> {
    const existingAnchor = this.findNearestExistingPath(resolvedPath);
    if (!existingAnchor) return;

    const realAnchor = await fs.realpath(existingAnchor);
    if (!this.isWithinAllowedRoots(realAnchor)) {
      throw new Error(`SECURITY VIOLATION: Symlink escape detected. Real: ${realAnchor}`);
    }

    if (existsSync(resolvedPath)) {
      const realTarget = await fs.realpath(resolvedPath);
      if (!this.isWithinAllowedRoots(realTarget)) {
        throw new Error(`SECURITY VIOLATION: Symlink escape detected. Real: ${realTarget}`);
      }
    }
  }

  private findNearestExistingPath(targetPath: string): string | null {
    let cursor = targetPath;
    while (!existsSync(cursor)) {
      const parent = path.dirname(cursor);
      if (parent === cursor) return null;
      cursor = parent;
    }
    return cursor;
  }

  private resolveAndValidateAllowedRoot(inputPath: string): string {
    const resolved = path.resolve(inputPath);
    this.assertNotCriticalRoot(resolved);

    if (existsSync(resolved)) {
      let canonical: string;
      try {
        canonical = realpathSync(resolved);
      } catch {
        throw new Error(`SECURITY VIOLATION: Unable to canonicalize allowed root: ${resolved}`);
      }
      this.assertNotCriticalRoot(canonical);
    }

    return resolved;
  }

  private assertNotCriticalRoot(candidate: string): void {
    if (DENIED_CRITICAL_ROOTS.has(candidate)) {
      throw new Error(`SECURITY VIOLATION: Attempted to whitelist critical system root: ${candidate}`);
    }
  }
}
