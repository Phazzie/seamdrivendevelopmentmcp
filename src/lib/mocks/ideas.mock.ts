/**
 * Purpose: Mock implementation for ideas using fixtures (ideas seam).
 */
import fs from "fs";
import path from "path";
import { AppError } from "../../../contracts/store.contract.js";
import type {
  IIdeaRegistry,
  Idea,
  IdeaListFilter,
  CreateIdeaInput,
  UpdateIdeaInput,
  IdeaIdInput,
  AddIdeaNoteInput
} from "../../../contracts/ideas.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "ideas", "sample.json");

type ScenarioOutputs = {
  create: Idea;
  update: Idea;
  list: Idea[];
  get: Idea;
  addNote: Idea;
};

type ScenarioFixture = {
  outputs?: ScenarioOutputs;
  error?: { code: string; message: string; details?: Record<string, unknown> };
};

type FixtureFile = {
  captured_at?: string;
  scenarios?: Record<string, ScenarioFixture>;
};

function loadFixture(): FixtureFile {
  if (!fs.existsSync(FIXTURE_PATH)) return {};
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  return JSON.parse(raw) as FixtureFile;
}

export class MockIdeaRegistry implements IIdeaRegistry {
  private readonly fixture: FixtureFile;

  constructor(private scenario = "success") {
    this.fixture = loadFixture();
  }

  private getScenario(): ScenarioFixture {
    const scenario = this.fixture.scenarios?.[this.scenario];
    if (!scenario) {
      throw new AppError("VALIDATION_FAILED", `Unknown scenario: ${this.scenario}`);
    }
    if (scenario.error) {
      throw new AppError(
        scenario.error.code as any,
        scenario.error.message,
        scenario.error.details
      );
    }
    return scenario;
  }

  private getOutputs(): ScenarioOutputs {
    const scenario = this.getScenario();
    if (!scenario.outputs) {
      throw new AppError("VALIDATION_FAILED", "Missing scenario outputs");
    }
    return scenario.outputs;
  }

  private ensureKnownId(id: string, outputs: ScenarioOutputs): void {
    const knownIds = new Set(outputs.list.map((idea) => idea.id));
    knownIds.add(outputs.create.id);
    knownIds.add(outputs.update.id);
    knownIds.add(outputs.get.id);
    knownIds.add(outputs.addNote.id);

    if (!knownIds.has(id)) {
      throw new AppError("VALIDATION_FAILED", `Idea ${id} not found`);
    }
  }

  async create(input: CreateIdeaInput): Promise<Idea> {
    const outputs = this.getOutputs();
    return outputs.create;
  }

  async update(input: UpdateIdeaInput): Promise<Idea> {
    const outputs = this.getOutputs();
    this.ensureKnownId(input.id, outputs);
    return outputs.update;
  }

  async list(filter?: IdeaListFilter): Promise<Idea[]> {
    const outputs = this.getOutputs();
    if (!filter) return outputs.list;

    let results = [...outputs.list];
    if (filter.status) {
      results = results.filter((idea) => idea.status === filter.status);
    }
    const tag = filter.tag;
    if (tag) {
      results = results.filter((idea) => idea.tags.includes(tag));
    }
    if (filter.query) {
      const query = filter.query.toLowerCase();
      results = results.filter((idea) =>
        idea.title.toLowerCase().includes(query) ||
        idea.summary.toLowerCase().includes(query)
      );
    }
    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  async get(input: IdeaIdInput): Promise<Idea> {
    const outputs = this.getOutputs();
    this.ensureKnownId(input.id, outputs);
    return outputs.get;
  }

  async addNote(input: AddIdeaNoteInput): Promise<Idea> {
    const outputs = this.getOutputs();
    this.ensureKnownId(input.ideaId, outputs);
    return outputs.addNote;
  }
}
