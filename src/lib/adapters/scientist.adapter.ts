// Purpose: Real implementation of the Scientist seam (seam: scientist)
import { IScientist, Experiment, ExperimentStatus, ExperimentResult, ExperimentSchema } from "../../../contracts/scientist.contract.js";
import { IStore, AppError } from "../../../contracts/store.contract.js";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import os from "os";

export class ScientistAdapter implements IScientist {
  constructor(private store: IStore) {}

  async createExperiment(ideaId: string, hypothesis: string, probeCode: string): Promise<Experiment> {
    const experiment: Experiment = {
      id: randomUUID(),
      ideaId,
      hypothesis,
      probeCode,
      status: "pending",
      result: null,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    await this.store.update((data) => {
      // Initialize if missing (schema migration handled by default, but safe to check)
      if (!data.experiments) data.experiments = [];
      data.experiments.push(experiment);
      return data;
    }, (await this.store.load()).revision);

    return experiment;
  }

  async runExperiment(id: string): Promise<ExperimentResult> {
    // 1. Load Experiment
    const state = await this.store.load();
    const experimentRaw = state.experiments.find((e: any) => e.id === id);
    if (!experimentRaw) {
      throw new AppError("VALIDATION_FAILED", `Experiment ${id} not found`);
    }
    const experiment = ExperimentSchema.parse(experimentRaw);

    // 2. Update Status to Running
    await this.store.update((data) => {
      const experiments = data.experiments as any[];
      const idx = experiments.findIndex((e: any) => e.id === id);
      if (idx !== -1) {
        experiments[idx].status = "running";
      }
      return data;
    }, state.revision);

    // 3. Execute
    const result = await this.executeInChildProcess(experiment.probeCode);

    // 4. Update Result
    await this.store.update((data) => {
      const experiments = data.experiments as any[];
      const idx = experiments.findIndex((e: any) => e.id === id);
      if (idx !== -1) {
        experiments[idx].status = result.exitCode === 0 ? "completed" : "failed";
        experiments[idx].result = result;
        experiments[idx].completedAt = new Date().toISOString();
      }
      return data;
    }, (await this.store.load()).revision);

    return result;
  }

  async listExperiments(status?: ExperimentStatus): Promise<Experiment[]> {
    const state = await this.store.load();
    const experiments = state.experiments.map((e: any) => ExperimentSchema.parse(e));
    if (status) {
      return experiments.filter((e) => e.status === status);
    }
    return experiments;
  }

  private async executeInChildProcess(code: string): Promise<ExperimentResult> {
    const tmpDir = path.join(os.tmpdir(), "gemini-scientist");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    
    const filePath = path.join(tmpDir, `probe-${randomUUID()}.ts`);
    // Basic sandboxing: ensure imports are safe? 
    // For V1 we assume the agent generates safe code (verified by user via tool approval).
    fs.writeFileSync(filePath, code);

    return new Promise((resolve) => {
      // Use ts-node to execute directly
      const child = spawn("npx", ["ts-node", "--skip-project", filePath], {
        env: { ...process.env, PATH: process.env.PATH },
        cwd: process.cwd() // Allow access to project modules? 
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (d) => stdout += d.toString());
      child.stderr.on("data", (d) => stderr += d.toString());

      child.on("error", (err) => {
        resolve({
          exitCode: 1,
          stdout,
          stderr,
          error: err.message
        });
      });

      child.on("close", (code) => {
        // Cleanup
        try { fs.unlinkSync(filePath); } catch (e) {}
        
        resolve({
          exitCode: code ?? 1,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      });

      // Timeout
      setTimeout(() => {
        child.kill();
        resolve({
          exitCode: 124, // Timeout
          stdout,
          stderr: stderr + "\n[Timeout]",
          error: "Execution timed out (5s)"
        });
      }, 5000);
    });
  }
}
