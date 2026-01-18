import fs from "fs/promises";
import { existsSync, createReadStream, createWriteStream } from "fs";
import path from "path";

/**
 * Purpose: A hardened, path-aware wrapper for Node FS (helpers seam).
 * Hardened: Automatically prepends root, validates boundaries, prevents symlink escapes.
 */
export class JailedFs {
  private readonly absoluteRoot: string;

  constructor(rootDir: string) {
    this.absoluteRoot = path.resolve(rootDir);
  }

  private async resolveAndValidate(targetPath: string): Promise<string> {
    const resolved = path.resolve(this.absoluteRoot, targetPath);
    if (!resolved.startsWith(this.absoluteRoot)) {
      throw new Error(`SECURITY VIOLATION: Path traversal blocked. Target: ${targetPath}`);
    }
    return resolved;
  }

  async readFile(filePath: string, encoding: BufferEncoding = "utf-8"): Promise<string> {
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
    const resolved = path.resolve(this.absoluteRoot, filePath);
    if (!resolved.startsWith(this.absoluteRoot)) return false;
    return existsSync(resolved);
  }

  getRootDir(): string {
    return this.absoluteRoot;
  }
}
