/**
 * Purpose: Real implementation for ideas (ideas seam).
 */
import { randomUUID } from "crypto";
import { AppError } from "../../../contracts/store.contract.js";
import type { IStore } from "../../../contracts/store.contract.js";
import {
  IdeaStatusSchema,
  type IIdeaRegistry,
  type Idea,
  type IdeaNote,
  type IdeaListFilter,
  type CreateIdeaInput,
  type UpdateIdeaInput,
  type AddIdeaNoteInput,
  type IdeaIdInput,
} from "../../../contracts/ideas.contract.js";
import { runTransaction } from "../helpers/store.helper.js";

export class IdeaAdapter implements IIdeaRegistry {
  constructor(private readonly store: IStore) {}

  async create(input: CreateIdeaInput): Promise<Idea> {
    return runTransaction(this.store, (current) => {
      const ideas = normalizeIdeas((current.ideas as IdeaRecord[]) || []);
      const now = Date.now();
      const idea: Idea = {
        id: randomUUID(),
        title: input.title,
        summary: input.summary ?? "",
        status: input.status ?? "draft",
        tags: input.tags ?? [],
        notes: [],
        relatedTaskIds: input.relatedTaskIds ?? [],
        relatedIdeaIds: input.relatedIdeaIds ?? [],
        created_at: now,
        updated_at: now,
      };

      return {
        nextState: { ...current, ideas: [...ideas, idea] },
        result: idea,
      };
    });
  }

  async update(input: UpdateIdeaInput): Promise<Idea> {
    return runTransaction(this.store, (current) => {
      const ideas = normalizeIdeas((current.ideas as IdeaRecord[]) || []);
      const index = ideas.findIndex((idea) => idea.id === input.id);
      if (index === -1) {
        throw new AppError("VALIDATION_FAILED", `Idea ${input.id} not found`);
      }

      const existing = ideas[index];
      const updated: Idea = {
        ...existing,
        title: input.title ?? existing.title,
        summary: input.summary ?? existing.summary,
        status: input.status ?? existing.status,
        tags: input.tags ?? existing.tags,
        relatedTaskIds: input.relatedTaskIds ?? existing.relatedTaskIds,
        relatedIdeaIds: input.relatedIdeaIds ?? existing.relatedIdeaIds,
        updated_at: Date.now(),
      };

      const nextIdeas = [...ideas];
      nextIdeas[index] = normalizeIdea(updated);

      return {
        nextState: { ...current, ideas: nextIdeas },
        result: nextIdeas[index],
      };
    });
  }

  async list(filter?: IdeaListFilter): Promise<Idea[]> {
    const current = await this.store.load();
    const ideas = normalizeIdeas((current.ideas as IdeaRecord[]) || []);
    return applyFilters(ideas, filter);
  }

  async get(input: IdeaIdInput): Promise<Idea> {
    const current = await this.store.load();
    const ideas = normalizeIdeas((current.ideas as IdeaRecord[]) || []);
    const idea = ideas.find((entry) => entry.id === input.id);
    if (!idea) {
      throw new AppError("VALIDATION_FAILED", `Idea ${input.id} not found`);
    }
    return idea;
  }

  async addNote(input: AddIdeaNoteInput): Promise<Idea> {
    return runTransaction(this.store, (current) => {
      const ideas = normalizeIdeas((current.ideas as IdeaRecord[]) || []);
      const index = ideas.findIndex((idea) => idea.id === input.ideaId);
      if (index === -1) {
        throw new AppError("VALIDATION_FAILED", `Idea ${input.ideaId} not found`);
      }

      const note: IdeaNote = {
        id: randomUUID(),
        author: input.author,
        body: input.body,
        created_at: Date.now(),
      };

      const existing = ideas[index];
      const updated: Idea = {
        ...existing,
        notes: [...existing.notes, note],
        updated_at: Date.now(),
      };

      const nextIdeas = [...ideas];
      nextIdeas[index] = normalizeIdea(updated);

      return {
        nextState: { ...current, ideas: nextIdeas },
        result: nextIdeas[index],
      };
    });
  }
}

type IdeaRecord = Idea & {
  tags?: string[];
  notes?: IdeaNote[];
  relatedTaskIds?: string[];
  relatedIdeaIds?: string[];
  summary?: string;
  status?: string;
};

function normalizeIdea(idea: IdeaRecord): Idea {
  const parsedStatus = IdeaStatusSchema.safeParse(idea.status);
  const status = parsedStatus.success ? parsedStatus.data : "draft";

  return {
    ...idea,
    summary: typeof idea.summary === "string" ? idea.summary : "",
    status,
    tags: Array.isArray(idea.tags) ? idea.tags : [],
    notes: Array.isArray(idea.notes) ? idea.notes : [],
    relatedTaskIds: Array.isArray(idea.relatedTaskIds) ? idea.relatedTaskIds : [],
    relatedIdeaIds: Array.isArray(idea.relatedIdeaIds) ? idea.relatedIdeaIds : [],
  };
}

function normalizeIdeas(ideas: IdeaRecord[]): Idea[] {
  return ideas.map(normalizeIdea);
}

function applyFilters(ideas: Idea[], filter?: IdeaListFilter): Idea[] {
  if (!filter) return [...ideas];

  let results = [...ideas];
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
