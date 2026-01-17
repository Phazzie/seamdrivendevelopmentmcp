/**
 * Purpose: Real implementation of the Probe Runner (probe_runner seam).
 */
import { spawn } from "child_process";
import fs from "fs/promises";
import { statSync } from "fs"; // Needed for legacy sync walk if we don't fully refactor walk to async generator, but I'll refactor walk.
import path from "path";
import { IProbeRunner, RunProbesInput, ProbeResult } from "../../../contracts/probe_runner.contract.js";

export class ProbeRunnerAdapter implements IProbeRunner {
  constructor(private readonly projectRoot: string) {}

  async run(input: RunProbesInput): Promise<ProbeResult[]> {
    const rootProbesDir = path.join(this.projectRoot, "probes");
    const allFiles = await this.walk(rootProbesDir);
    const files = allFiles.filter(f => f.endsWith(".probe.ts") || f.endsWith(".ts"));
    
    // Simple filter support
    const pattern = (input.pattern || "").replace("probes/", "").replace("**/*", "");
    const filteredFiles = files.filter(f => f.includes(pattern));

    const results: ProbeResult[] = [];

    for (const file of filteredFiles) {
      const start = Date.now();
      const name = path.relative(rootProbesDir, file);
      
      try {
        const outDir = path.join(this.projectRoot, "dist/probes");
        
        // Compile
        const compile = await this.exec("npx", [
          "tsc", file,
          "--outDir", outDir,
          "--rootDir", this.projectRoot,
          "--module", "esnext",
          "--target", "es2022",
          "--moduleResolution", "node",
          "--esModuleInterop",
          "--skipLibCheck"
        ]);

        if (compile.code !== 0) {
          results.push({
            name,
            success: false,
            code: compile.code,
            stdout: compile.stdout,
            stderr: compile.stderr,
            durationMs: Date.now() - start
          });
          continue;
        }

        const relPath = path.relative(this.projectRoot, file);
        const jsFile = path.join(outDir, relPath.replace(".ts", ".js"));

        try {
          await fs.stat(jsFile);
        } catch {
             throw new Error(`Compiled file not found at ${jsFile}`);
        }

        const run = await this.exec("node", [jsFile]);

        results.push({
          name,
          success: run.code === 0,
          code: run.code,
          stdout: run.stdout,
          stderr: run.stderr,
          durationMs: Date.now() - start
        });

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          name,
          success: false,
          code: null,
          stdout: "",
          stderr: msg,
          durationMs: Date.now() - start
        });
      }
    }

    return results;
  }

  private async walk(dir: string): Promise<string[]> {
    let results: string[] = [];
    try {
      const list = await fs.readdir(dir);
      for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          results = results.concat(await this.walk(filePath));
        } else {
          results.push(filePath);
        }
      }
    } catch {
      // Ignore errors if dir doesn't exist
    }
    return results;
  }

  private exec(cmd: string, args: string[]): Promise<{ code: number | null, stdout: string, stderr: string }> {
    return new Promise((resolve) => {
      const proc = spawn(cmd, args, { shell: true, cwd: this.projectRoot });
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => stdout += data.toString());
      proc.stderr.on("data", (data) => stderr += data.toString());

      proc.on("close", (code) => {
        resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
      });
    });
  }
}
