import { z } from "zod";
import { IToolProvider, ToolHandler } from "../helpers/tool_registry.js";
import { KnowledgeAdapter } from "../adapters/knowledge.adapter.js";
import { AdrAdapter } from "../adapters/adr.adapter.js";
import { IdeaAdapter } from "../adapters/ideas.adapter.js";

export class IntelligenceProvider implements IToolProvider {
  constructor(
    private knowledge: KnowledgeAdapter,
    private adrs: AdrAdapter,
    private ideas: IdeaAdapter
  ) {}

  getTools() {
    return [
      {
        name: "knowledge_add_node",
        description: "Add a node to the shared knowledge graph.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string" },
            content: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["type", "content", "agentId"]
        }
      },
      {
        name: "knowledge_link_nodes",
        description: "Link two knowledge graph nodes.",
        inputSchema: {
          type: "object",
          properties: {
            fromId: { type: "string" },
            toId: { type: "string" },
            relation: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["fromId", "toId", "relation", "agentId"]
        }
      },
      {
        name: "knowledge_query",
        description: "Query the knowledge graph.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string" },
            text: { type: "string" },
            relation: { type: "string" },
            limit: { type: "number" },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "create_adr",
        description: "Create a new ADR entry.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            status: { type: "string", enum: ["proposed", "accepted"] },
            context: { type: "string" },
            decision: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["title", "context", "decision", "agentId"]
        }
      }
    ];
  }

  getHandlers(): Record<string, ToolHandler> {
    return {
      knowledge_add_node: async (args) => {
        const input = z.object({ type: z.string(), content: z.string() }).parse(args);
        return await this.knowledge.addNode(input.type, input.content);
      },
      knowledge_link_nodes: async (args) => {
        const input = z.object({ fromId: z.string(), toId: z.string(), relation: z.string() }).parse(args);
        return await this.knowledge.linkNodes(input.fromId, input.toId, input.relation);
      },
      knowledge_query: async (args) => {
        const input = z.object({ type: z.string().optional(), text: z.string().optional(), relation: z.string().optional(), limit: z.number().optional() }).parse(args);
        return await this.knowledge.query(input);
      },
      create_adr: async (args) => {
        const input = z.object({ title: z.string(), context: z.string(), decision: z.string(), status: z.any().optional() }).parse(args);
        return await this.adrs.create(input);
      }
    };
  }
}
