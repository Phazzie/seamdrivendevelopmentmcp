import path from "path";
import fs from "fs/promises";
import { existsSync, realpathSync } from "fs";

const DENIED_CRITICAL_ROOTS = new Set(["/", "/Users", "/home"]);

/**
 * Purpose: Enforce directory jailing and prevent path traversal (infrastructure seam).
 */
export class PathGuard {
  private readonly allowedRoots: string[];

  constructor(rootDir: string, extraAllowed: string[] = []) {
    const resolvedRoot = this.resolveAndValidateAllowedRoot(rootDir);
    this.allowedRoots = [resolvedRoot];

    for (const p of extraAllowed) {
      const resolved = this.resolveAndValidateAllowedRoot(p);
      this.allowedRoots.push(resolved);
    }
  }

  /**
   * Validates that a target path resides within one of the allowed root directories.
   * Resolves symlinks to prevent escaping the jail.
   */
  async validate(targetPath: string): Promise<string> {
    const resolvedTarget = path.resolve(this.allowedRoots[0], targetPath);

    if (!this.isWithinAllowedRoots(resolvedTarget)) {
      throw new Error(
        `SECURITY VIOLATION: Path traversal attempt blocked. Target: ${targetPath}`
      );
    }

    await this.assertNoSymlinkEscape(resolvedTarget);

    return resolvedTarget;
  }

  /**
   * Join parts and return a jailed absolute path.
   */
  join(...parts: string[]): string {
    return path.join(this.allowedRoots[0], ...parts);
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

  private async assertNoSymlinkEscape(resolvedTarget: string): Promise<void> {
    const existingAnchor = this.findNearestExistingPath(resolvedTarget);
    if (!existingAnchor) return;

    const realAnchor = await fs.realpath(existingAnchor);
    if (!this.isWithinAllowedRoots(realAnchor)) {
      throw new Error(`SECURITY VIOLATION: Symlink escape detected. Real: ${realAnchor}`);
    }

    if (existsSync(resolvedTarget)) {
      const realTarget = await fs.realpath(resolvedTarget);
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
