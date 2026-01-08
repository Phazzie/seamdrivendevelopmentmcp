import { randomUUID } from "crypto";
import type { IStore } from "../../../contracts/store.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";
import {
  IKnowledgeGraph,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
  KnowledgeQuery,
  KnowledgeQuerySchema,
} from "../../../contracts/knowledge.contract.js";

export class KnowledgeAdapter implements IKnowledgeGraph {
  constructor(private readonly store: IStore) {}

  async addNode(type: string, content: string): Promise<KnowledgeNode> {
    if (!type || !content) {
      throw new AppError("VALIDATION_FAILED", "Type and content are required.");
    }

    return runTransaction(this.store, (current) => {
      const graph = normalizeGraph(current.knowledge as KnowledgeGraph);
      const now = Date.now();
      const node: KnowledgeNode = {
        id: randomUUID(),
        type,
        content,
        created_at: now,
        updated_at: now,
      };

      const nextGraph: KnowledgeGraph = {
        ...graph,
        nodes: [...graph.nodes, node],
      };

      return {
        nextState: { ...current, knowledge: nextGraph },
        result: node,
      };
    });
  }

  async linkNodes(fromId: string, toId: string, relation: string): Promise<KnowledgeEdge> {
    if (!fromId || !toId || !relation) {
      throw new AppError("VALIDATION_FAILED", "fromId, toId, and relation are required.");
    }

    return runTransaction(this.store, (current) => {
      const graph = normalizeGraph(current.knowledge as KnowledgeGraph);
      const fromNode = graph.nodes.find((node) => node.id === fromId);
      const toNode = graph.nodes.find((node) => node.id === toId);

      if (!fromNode) {
        throw new AppError("VALIDATION_FAILED", `Node ${fromId} not found`);
      }
      if (!toNode) {
        throw new AppError("VALIDATION_FAILED", `Node ${toId} not found`);
      }

      const edge: KnowledgeEdge = {
        id: randomUUID(),
        from: fromId,
        to: toId,
        relation,
        created_at: Date.now(),
      };

      const nextGraph: KnowledgeGraph = {
        ...graph,
        edges: [...graph.edges, edge],
      };

      return {
        nextState: { ...current, knowledge: nextGraph },
        result: edge,
      };
    });
  }

  async query(query: KnowledgeQuery) {
    const parsed = KnowledgeQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid knowledge query.", {
        issues: parsed.error.issues,
      });
    }

    const current = await this.store.load();
    const graph = normalizeGraph(current.knowledge as KnowledgeGraph);
    const { type, text, relation, limit } = parsed.data;

    let nodes = graph.nodes;
    if (type) {
      nodes = nodes.filter((node) => node.type === type);
    }
    if (text) {
      const lowered = text.toLowerCase();
      nodes = nodes.filter((node) => node.content.toLowerCase().includes(lowered));
    }
    if (typeof limit === "number") {
      nodes = nodes.slice(0, limit);
    }

    const nodeIds = new Set(nodes.map((node) => node.id));
    let edges = graph.edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
    if (relation) {
      edges = edges.filter((edge) => edge.relation === relation);
    }

    return { nodes, edges };
  }
}

function normalizeGraph(graph: KnowledgeGraph | undefined): KnowledgeGraph {
  return {
    nodes: Array.isArray(graph?.nodes) ? graph!.nodes : [],
    edges: Array.isArray(graph?.edges) ? graph!.edges : [],
  };
}
