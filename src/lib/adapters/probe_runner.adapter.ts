/**
 * Purpose: Real implementation of the Probe Runner (probe_runner seam).
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { IProbeRunner, RunProbesInput, ProbeResult } from "../../../contracts/probe_runner.contract.js";

export class ProbeRunnerAdapter implements IProbeRunner {
  async run(input: RunProbesInput): Promise<ProbeResult[]> {
    const rootProbesDir = path.resolve("probes");
    const allFiles = this.walk(rootProbesDir);
    const files = allFiles.filter(f => f.endsWith(".probe.ts") || f.endsWith(".ts"));
    
    // Simple filter support (substring match) since we don't have a glob library
    const pattern = input.pattern.replace("probes/", "").replace("**/*", "");
    const filteredFiles = files.filter(f => f.includes(pattern));

    const results: ProbeResult[] = [];

    for (const file of filteredFiles) {
      const start = Date.now();
      const name = path.relative(rootProbesDir, file);
      
      try {
        const outDir = path.resolve("dist/probes");
        
        // Compile (preserving directory structure flattened or relative - simplest is to just compile file-by-file)
        const compile = await this.exec("npx", [
          "tsc", file,
          "--outDir", outDir,
          "--rootDir", process.cwd(),
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

        // TSC output path calculation is tricky when compiling single files to an outDir.
        // It typically mirrors the relative path from the root.
        // E.g. tsc probes/tui/chat.ts --outDir dist/probes -> dist/probes/probes/tui/chat.js
        // We need to find where it actually landed.
        
        // With --rootDir ., tsc mirrors the full structure relative to CWD.
        const relPath = path.relative(process.cwd(), file);
        const jsFile = path.join(outDir, relPath.replace(".ts", ".js"));

        if (!fs.existsSync(jsFile)) {
             // Fallback: checks if tsc flattened it (unlikely with recent tsc) or put it elsewhere
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

      } catch (err: any) {
        results.push({
          name,
          success: false,
          code: null,
          stdout: "",
          stderr: err.message,
          durationMs: Date.now() - start
        });
      }
    }

    return results;
  }

  private walk(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(this.walk(filePath));
      } else {
        results.push(filePath);
      }
    });
    return results;
  }

  private exec(cmd: string, args: string[]): Promise<{ code: number | null, stdout: string, stderr: string }> {
    return new Promise((resolve) => {
      const proc = spawn(cmd, args, { shell: true });
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