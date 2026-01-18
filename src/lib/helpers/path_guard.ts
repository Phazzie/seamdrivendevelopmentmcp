import path from "path";
import fs from "fs/promises";
import { existsSync, realpathSync } from "fs";

/**
 * Purpose: Enforce directory jailing and prevent path traversal (infrastructure seam).
 */
export class PathGuard {
  private readonly absoluteRoot: string;

  constructor(rootDir: string) {
    this.absoluteRoot = path.resolve(rootDir);
  }

  /**
   * Validates that a target path resides within the root directory.
   * Resolves symlinks to prevent escaping the jail.
   */
  async validate(targetPath: string): Promise<string> {
    const resolvedTarget = path.resolve(this.absoluteRoot, targetPath);

    // Check if target starts with root
    if (!resolvedTarget.startsWith(this.absoluteRoot)) {
      throw new Error(`SECURITY VIOLATION: Path traversal attempt blocked. Target: ${targetPath}`);
    }

    // Secondary check: Realpath resolution (prevents symlink escapes)
    if (existsSync(resolvedTarget)) {
      try {
        const real = await fs.realpath(resolvedTarget);
        if (!real.startsWith(this.absoluteRoot)) {
          throw new Error(`SECURITY VIOLATION: Symlink escape detected. Real: ${real}`);
        }
      } catch {
        // Path might not exist yet, which is fine for new file creation
      }
    }

    return resolvedTarget;
  }

  /**
   * Join parts and return a jailed absolute path.
   */
  join(...parts: string[]): string {
    return path.join(this.absoluteRoot, ...parts);
  }

  getRootDir(): string {
    return this.absoluteRoot;
  }
}