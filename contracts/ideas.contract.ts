/**
 * Purpose: Define contract for ideas (seam: ideas).
 */
import { z } from "zod";

export const IdeaStatusSchema = z.enum([
  "draft",
  "active",
  "parked",
  "archived"
]);
export type IdeaStatus = z.infer<typeof IdeaStatusSchema>;

export const IdeaNoteSchema = z.object({
  id: z.string().uuid(),
  author: z.string().optional(),
  body: z.string().min(1),
  created_at: z.number(),
});
export type IdeaNote = z.infer<typeof IdeaNoteSchema>;

export const IdeaSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  summary: z.string(),
  status: IdeaStatusSchema,
  tags: z.array(z.string()),
  notes: z.array(IdeaNoteSchema),
  relatedTaskIds: z.array(z.string().uuid()),
  relatedIdeaIds: z.array(z.string().uuid()),
  created_at: z.number(),
  updated_at: z.number(),
});
export type Idea = z.infer<typeof IdeaSchema>;

export const IdeaListFilterSchema = z.object({
  status: IdeaStatusSchema.optional(),
  tag: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().int().positive().optional(),
});
export type IdeaListFilter = z.infer<typeof IdeaListFilterSchema>;

export const CreateIdeaInputSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  status: IdeaStatusSchema.optional().default("draft"),
  tags: z.array(z.string()).optional(),
  relatedTaskIds: z.array(z.string().uuid()).optional(),
  relatedIdeaIds: z.array(z.string().uuid()).optional(),
});
export type CreateIdeaInput = z.input<typeof CreateIdeaInputSchema>;

export const UpdateIdeaInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  status: IdeaStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  relatedTaskIds: z.array(z.string().uuid()).optional(),
  relatedIdeaIds: z.array(z.string().uuid()).optional(),
});
export type UpdateIdeaInput = z.input<typeof UpdateIdeaInputSchema>;

export const IdeaIdInputSchema = z.object({
  id: z.string().uuid(),
});
export type IdeaIdInput = z.infer<typeof IdeaIdInputSchema>;

export const AddIdeaNoteInputSchema = z.object({
  ideaId: z.string().uuid(),
  author: z.string().optional(),
  body: z.string().min(1),
});
export type AddIdeaNoteInput = z.input<typeof AddIdeaNoteInputSchema>;

export const IdeaScenarioSchema = z.object({
  description: z.string().optional(),
  outputs: z.object({
    create: IdeaSchema,
    update: IdeaSchema,
    list: z.array(IdeaSchema),
    get: IdeaSchema,
    addNote: IdeaSchema,
  }).optional(),
  error: z.object({
    code: z.enum([
      "LOCKED",
      "STALE_REVISION",
      "PANIC_MODE",
      "VALIDATION_FAILED",
      "INTERNAL_ERROR",
    ]),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});
export type IdeaScenario = z.infer<typeof IdeaScenarioSchema>;

export const IdeaFixtureSchema = z.object({
  captured_at: z.string(),
  scenarios: z.record(z.string(), IdeaScenarioSchema),
});
export type IdeaFixture = z.infer<typeof IdeaFixtureSchema>;

export interface IIdeaRegistry {
  create(input: CreateIdeaInput): Promise<Idea>;
  update(input: UpdateIdeaInput): Promise<Idea>;
  list(filter?: IdeaListFilter): Promise<Idea[]>;
  get(input: IdeaIdInput): Promise<Idea>;
  addNote(input: AddIdeaNoteInput): Promise<Idea>;
}
