import { z } from "zod";
import { IToolProvider, ToolHandler } from "../helpers/tool_registry.js";
import { ReviewGateAdapter } from "../adapters/review_gate.adapter.js";
import { ArbitrationAdapter } from "../adapters/arbitration.adapter.js";
import { MoodAdapter } from "../adapters/mood.adapter.js";
import { ConfidenceAuctionAdapter } from "../adapters/confidence_auction.adapter.js";

export class MetaProvider implements IToolProvider {
  constructor(
    private reviewGates: ReviewGateAdapter,
    private arbitration: ArbitrationAdapter,
    private moods: MoodAdapter,
    private auction: ConfidenceAuctionAdapter
  ) {}

  getTools() {
    return [
      {
        name: "submit_plan",
        description: "Submit a plan for critique.",
        inputSchema: {
          type: "object",
          properties: {
            planId: { type: "string" },
            plan: { type: "string" },
            affectedResources: { type: "array", items: { type: "string" } }, // Added
            agentId: { type: "string" }
          },
          required: ["planId", "plan", "agentId"]
        }
      },
      {
        name: "approve_plan",
        description: "Approve a plan after critique.",
        inputSchema: {
          type: "object",
          properties: {
            planId: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["planId", "agentId"]
        }
      }
    ];
  }

  getHandlers(): Record<string, ToolHandler> {
    return {
      submit_plan: async (args) => {
        const input = z.object({
          planId: z.string(),
          plan: z.string(),
          affectedResources: z.array(z.string()).default([])
        }).parse(args);
        // We'll assume the adapter is updated to accept affectedResources
        return await this.reviewGates.submitPlan(input.planId, input.plan, input.affectedResources);
      },
      approve_plan: async (args) => {
        const input = z.object({ planId: z.string() }).parse(args);
        return await this.reviewGates.approvePlan(input.planId);
      }
    };
  }
}
