import fs from "fs";
import path from "path";
import type { IKnowledgeGraph, KnowledgeEdge, KnowledgeNode, KnowledgeQuery } from "../../../contracts/knowledge.contract.js";
import { AppError } from "../../../contracts/store.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "knowledge", "sample.json");

type KnowledgeFixture = {
  captured_at?: string;
  nodes?: KnowledgeNode[];
  edges?: KnowledgeEdge[];
};

function loadFixture(): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
  if (!fs.existsSync(FIXTURE_PATH)) return { nodes: [], edges: [] };
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as KnowledgeFixture;
  return {
    nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
    edges: Array.isArray(parsed.edges) ? parsed.edges : [],
  };
}

export class MockKnowledgeGraph implements IKnowledgeGraph {
  private nodes: KnowledgeNode[];
  private edges: KnowledgeEdge[];

  constructor() {
    const data = loadFixture();
    this.nodes = data.nodes;
    this.edges = data.edges;
  }

  async addNode(type: string, content: string): Promise<KnowledgeNode> {
    if (!type || !content) {
      throw new AppError("VALIDATION_FAILED", "Type and content are required.");
    }

    const now = Date.now();
    const node: KnowledgeNode = {
      id: `00000000-0000-0000-0000-${(this.nodes.length + 1).toString().padStart(12, "0")}`,
      type,
      content,
      created_at: now,
      updated_at: now,
    };

    this.nodes.push(node);
    return node;
  }

  async linkNodes(fromId: string, toId: string, relation: string): Promise<KnowledgeEdge> {
    const fromNode = this.nodes.find((node) => node.id === fromId);
    const toNode = this.nodes.find((node) => node.id === toId);

    if (!fromNode) throw new AppError("VALIDATION_FAILED", `Node ${fromId} not found`);
    if (!toNode) throw new AppError("VALIDATION_FAILED", `Node ${toId} not found`);
    if (!relation) throw new AppError("VALIDATION_FAILED", "relation is required.");

    const edge: KnowledgeEdge = {
      id: `00000000-0000-0000-0000-${(this.edges.length + 1).toString().padStart(12, "0")}`,
      from: fromId,
      to: toId,
      relation,
      created_at: Date.now(),
    };

    this.edges.push(edge);
    return edge;
  }

  async query(query: KnowledgeQuery) {
    const { type, text, relation, limit } = query;
    let nodes = this.nodes;
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
    let edges = this.edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
    if (relation) {
      edges = edges.filter((edge) => edge.relation === relation);
    }

    return { nodes, edges };
  }
}
