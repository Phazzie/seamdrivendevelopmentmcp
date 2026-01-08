/**
 * Purpose: Define contract for knowledge_graph (seam: knowledge).
 */
import { z } from "zod";

export const KnowledgeNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  content: z.string().min(1),
  created_at: z.number(),
  updated_at: z.number(),
});
export type KnowledgeNode = z.infer<typeof KnowledgeNodeSchema>;

export const KnowledgeEdgeSchema = z.object({
  id: z.string().uuid(),
  from: z.string().uuid(),
  to: z.string().uuid(),
  relation: z.string().min(1),
  created_at: z.number(),
});
export type KnowledgeEdge = z.infer<typeof KnowledgeEdgeSchema>;

export const KnowledgeGraphSchema = z.object({
  nodes: z.array(KnowledgeNodeSchema).default([]),
  edges: z.array(KnowledgeEdgeSchema).default([]),
});
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;

export const KnowledgeQuerySchema = z.object({
  type: z.string().optional(),
  text: z.string().optional(),
  relation: z.string().optional(),
  limit: z.number().int().positive().optional(),
});
export type KnowledgeQuery = z.infer<typeof KnowledgeQuerySchema>;

export const KnowledgeQueryResultSchema = z.object({
  nodes: z.array(KnowledgeNodeSchema),
  edges: z.array(KnowledgeEdgeSchema),
});
export type KnowledgeQueryResult = z.infer<typeof KnowledgeQueryResultSchema>;

export const KnowledgeFixtureSchema = z.object({
  captured_at: z.string(),
  nodes: z.array(KnowledgeNodeSchema),
  edges: z.array(KnowledgeEdgeSchema),
});
export type KnowledgeFixture = z.infer<typeof KnowledgeFixtureSchema>;

export interface IKnowledgeGraph {
  addNode(type: string, content: string): Promise<KnowledgeNode>;
  linkNodes(fromId: string, toId: string, relation: string): Promise<KnowledgeEdge>;
  query(query: KnowledgeQuery): Promise<KnowledgeQueryResult>;
}
