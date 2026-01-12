// Purpose: Mock for the Scientist seam (autonomous probing) (seam: scientist)
import { IScientist, Experiment, ExperimentStatus, ExperimentResult } from "../../../contracts/scientist.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ScientistMock implements IScientist {
  private experiments: Experiment[] = [];
  private fixtures: any;

  constructor() {
    this.loadFixtures();
  }

  private loadFixtures() {
    const fixturePath = path.join(process.cwd(), "fixtures", "scientist", "default.json");
    if (fs.existsSync(fixturePath)) {
        const content = fs.readFileSync(fixturePath, "utf-8");
        this.fixtures = JSON.parse(content);
    } else {
        // Fallback or error if fixture missing
        this.fixtures = { scenarios: {} };
    }
  }

  async createExperiment(ideaId: string, hypothesis: string, probeCode: string): Promise<Experiment> {
    const experiment: Experiment = {
      id: "exp-" + Math.random().toString(36).substring(7),
      ideaId,
      hypothesis,
      probeCode,
      status: "pending",
      result: null,
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    this.experiments.push(experiment);
    return experiment;
  }

  async runExperiment(id: string): Promise<ExperimentResult> {
    const exp = this.experiments.find(e => e.id === id);
    if (!exp) throw new AppError("VALIDATION_FAILED", `Experiment ${id} not found`);

    // Deterministic behavior based on probeCode content
    // We map the probeCode (or a known identifier in it) to a fixture scenario
    let scenarioKey = "successful_run";
    const isFailure = exp.probeCode.includes("exit(1)");
    
    if (isFailure) {
        scenarioKey = "failed_run";
    }

    const resultData = this.fixtures.scenarios[scenarioKey];
    if (!resultData) {
         throw new AppError("INTERNAL_ERROR", `Missing fixture scenario for ${scenarioKey}`);
    }

    const result: ExperimentResult = {
        exitCode: resultData.exitCode,
        stdout: resultData.stdout,
        stderr: resultData.stderr,
        error: resultData.error
    };

    exp.status = result.exitCode === 0 ? "completed" : "failed";
    exp.result = result;
    exp.completedAt = new Date().toISOString();

    return result;
  }

  async listExperiments(status?: ExperimentStatus): Promise<Experiment[]> {
    if (status) {
      return this.experiments.filter(e => e.status === status);
    }
    return this.experiments;
  }
}
