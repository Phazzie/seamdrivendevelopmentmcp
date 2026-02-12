import { z } from "zod";
import { IToolProvider, ToolHandler } from "../helpers/tool_registry.js";
import { KnowledgeAdapter } from "../adapters/knowledge.adapter.js";
import { AdrAdapter } from "../adapters/adr.adapter.js";
import { IdeaAdapter } from "../adapters/ideas.adapter.js";
import { IdeaStatusSchema } from "../../../contracts/ideas.contract.js";
import { AdrInput, AdrStatus } from "../../../contracts/adr.contract.js";

/**
 * Purpose: Intelligence Tool Provider (intelligence seam).
 */
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
      },
      {
        name: "ideas_create",
        description: "Create a new project idea or brainstorming seed.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            agentId: { type: "string" }
          },
          required: ["title", "agentId"]
        }
      },
      {
        name: "ideas_list",
        description: "List and filter project ideas.",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["draft", "active", "parked", "archived"] },
            tag: { type: "string" },
            query: { type: "string" },
            limit: { type: "number", default: 10 },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "ideas_add_note",
        description: "Add a collaborative note to an existing idea.",
        inputSchema: {
          type: "object",
          properties: {
            ideaId: { type: "string" },
            body: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["ideaId", "body", "agentId"]
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
        const input = z.object({ 
          title: z.string(), 
          context: z.string(), 
          decision: z.string(), 
          status: z.string().optional() 
        }).parse(args);

        const adrInput: AdrInput = {
          title: input.title,
          context: input.context,
          decision: input.decision,
          status: input.status as AdrStatus // Mapping enum string is permitted
        };
        return await this.adrs.create(adrInput);
      },
      ideas_create: async (args) => {
        const input = z.object({ 
          title: z.string(), 
          summary: z.string().optional(), 
          tags: z.array(z.string()).optional() 
        }).parse(args);

        return await this.ideas.create({
          title: input.title,
          summary: input.summary,
          tags: input.tags
        });
      },
      ideas_list: async (args) => {
        const input = z.object({ status: IdeaStatusSchema.optional(), tag: z.string().optional(), query: z.string().optional(), limit: z.number().optional() }).parse(args);
        return await this.ideas.list(input);
      },
      ideas_add_note: async (args) => {
        const input = z.object({ ideaId: z.string(), body: z.string(), agentId: z.string() }).parse(args);
        return await this.ideas.addNote({ ideaId: input.ideaId, body: input.body, author: input.agentId });
      }
    };
  }
}