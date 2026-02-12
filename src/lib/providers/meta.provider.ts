import { z } from "zod";
import { IToolProvider, ToolHandler } from "../helpers/tool_registry.js";
import { ReviewGateAdapter } from "../adapters/review_gate.adapter.js";
import { ArbitrationAdapter } from "../adapters/arbitration.adapter.js";
import { MoodAdapter } from "../adapters/mood.adapter.js";
import { ConfidenceAuctionAdapter } from "../adapters/confidence_auction.adapter.js";
import { BuildPlanAdapter } from "../adapters/build_plan.adapter.js";
import { PlanParserAdapter } from "../adapters/plan_parser.adapter.js";
import { BuildPlanInput } from "../../../contracts/build_plan.contract.js";
import type { IStore, PersistedStore } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";

/**
 * Purpose: Meta-coordination Tool Provider (meta seam).
 * Hardened: Descriptions include AI-Directives for procedural enforcement.
 */
export class MetaProvider implements IToolProvider {
  private readonly builder = new BuildPlanAdapter();
  private readonly parser = new PlanParserAdapter();

  constructor(
    private review: ReviewGateAdapter,
    private arbitration: ArbitrationAdapter,
    private mood: MoodAdapter,
    private auction: ConfidenceAuctionAdapter,
    private store: IStore
  ) {}

  getTools() {
    return [
      {
        name: "submit_plan",
        description: "Submit a high-rigor development plan for critique. AI DIRECTIVE: You MUST list all 'affectedResources' correctly. The server will reject your lock requests if they do not match this plan.",
        inputSchema: {
          type: "object",
          properties: {
            planId: { type: "string" },
            plan: { type: "string", description: "Markdown description of the work." },
            affectedResources: { type: "array", items: { type: "string" }, description: "List of files you will need to lock." },
            agentId: { type: "string" }
          },
          required: ["planId", "plan", "agentId"]
        }
      },
      {
        name: "submit_critique",
        description: "Provide a technical critique for a plan. AI DIRECTIVE: Be critical. Focus on Mandate Violations, Sync I/O, and JailedFs escapes.",
        inputSchema: {
          type: "object",
          properties: {
            planId: { type: "string" },
            critique: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["planId", "critique", "agentId"]
        }
      },
      {
        name: "approve_plan",
        description: "Approve a plan for execution. AI DIRECTIVE: Only call this once a critique has been addressed or if the plan is low-risk.",
        inputSchema: {
          type: "object",
          properties: { planId: { type: "string" }, agentId: { type: "string" } },
          required: ["planId", "agentId"]
        }
      },
      {
        name: "trigger_panic",
        description: "Emergency freeze: Block all write operations system-wide. AI DIRECTIVE: Call this ONLY if you detect massive data corruption, a jailbreak, or systemic mandate collapse.",
        inputSchema: {
          type: "object",
          properties: { reason: { type: "string" }, agentId: { type: "string" } },
          required: ["reason", "agentId"]
        }
      },
      {
        name: "resolve_panic",
        description: "Restore normal operations after a Panic Mode freeze.",
        inputSchema: {
          type: "object",
          properties: { agentId: { type: "string" } },
          required: ["agentId"]
        }
      },
      {
        name: "build_plan",
        description: "Generate a structured Markdown plan from a JSON-like schema.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            sections: { type: "array", items: { type: "object" } },
            orphanItems: { type: "array", items: { type: "object" } },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "decompose_plan",
        description: "Ingest a Markdown plan and extract structured task objects.",
        inputSchema: {
          type: "object",
          properties: {
            markdown: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["markdown", "agentId"]
        }
      }
    ];
  }

  getHandlers(): Record<string, ToolHandler> {
    return {
      submit_plan: async (args) => {
        const input = z.object({ planId: z.string(), plan: z.string(), affectedResources: z.array(z.string()).optional() }).parse(args);
        return await this.review.submitPlan(input.planId, input.plan, input.affectedResources);
      },
      submit_critique: async (args) => {
        const input = z.object({ planId: z.string(), critique: z.string() }).parse(args);
        return await this.review.submitCritique(input.planId, input.critique);
      },
      approve_plan: async (args) => {
        const input = z.object({ planId: z.string() }).parse(args);
        return await this.review.approvePlan(input.planId);
      },
      trigger_panic: async (args) => {
        z.object({ reason: z.string() }).parse(args);
        return await this.setPanicMode(true);
      },
      resolve_panic: async () => {
        return await this.setPanicMode(false);
      },
      build_plan: async (args) => {
        const input = z.object({ 
          title: z.string().optional(), 
          sections: z.array(z.any()).optional(), 
          orphanItems: z.array(z.any()).optional() 
        }).parse(args);

        const planInput: BuildPlanInput = {
          title: input.title,
          sections: input.sections || [],
          orphanItems: input.orphanItems || []
        };
        return await this.builder.build(planInput);
      },
      decompose_plan: async (args) => {
        const input = z.object({ markdown: z.string() }).parse(args);
        return await this.parser.parse({ markdown: input.markdown });
      }
    };
  }

  private async setPanicMode(nextValue: boolean): Promise<PersistedStore> {
    return runTransaction(this.store, (current) => {
      const nextState: PersistedStore = {
        ...current,
        panic_mode: nextValue,
      };
      return { nextState, result: nextState };
    }, "Failed to update panic mode after retries");
  }
}
