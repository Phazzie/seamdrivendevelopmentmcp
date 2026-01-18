import fs from "fs";
import { 
  IKnowledgeGraph, 
  KnowledgeGraph, 
  KnowledgeQuery 
} from "../../../contracts/knowledge.contract.js";

/**
 * Purpose: Mock implementation of the Knowledge Graph (knowledge seam).
 * Hardened: Grounded in fixture scenarios.
 */
export class MockKnowledgeGraph implements IKnowledgeGraph {
  private graph: KnowledgeGraph = { nodes: [], edges: [] };

  constructor(private readonly fixturePath: string, private readonly scenario = "success") {
    if (fs.existsSync(fixturePath)) {
      const raw = fs.readFileSync(fixturePath, "utf-8");
      const fixture = JSON.parse(raw);
      const s = fixture.scenarios?.[scenario] || fixture.scenarios?.["success"];
      if (s?.outputs) {
        // Fix: Fixture might wrap the graph in 'nodes' key or provide it directly
        this.graph = s.outputs.nodes && Array.isArray(s.outputs.nodes) ? s.outputs : s.outputs;
      }
    }
  }

  async query(query: KnowledgeQuery): Promise<KnowledgeGraph> {
    let nodes = this.graph.nodes;
    if (query.type) {
      nodes = nodes.filter(n => n.type === query.type);
    }
    return { nodes, edges: this.graph.edges };
  }

  async addNode(type: string, content: string): Promise<any> {
    return { id: "new-node", type, content, created_at: Date.now(), updated_at: Date.now() };
  }

  async linkNodes(fromId: string, toId: string, relation: string): Promise<any> {
    return { fromId, toId, relation, created_at: Date.now() };
  }
}
