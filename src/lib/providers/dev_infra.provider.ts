import { z } from "zod";
import { IToolProvider, ToolHandler } from "../helpers/tool_registry.js";
import { SddTrackingAdapter } from "../adapters/sdd_tracking.adapter.js";
import { ScaffolderAdapter } from "../adapters/scaffolder.adapter.js";
import { ProbeRunnerHelper } from "../helpers/probe_runner.helper.js";
import { PathGuard } from "../helpers/path_guard.js";

export class DevInfraProvider implements IToolProvider {
  constructor(
    private sdd: SddTrackingAdapter,
    private scaffolder: ScaffolderAdapter,
    private probeRunner: ProbeRunnerHelper,
    private pathGuard: PathGuard
  ) {}

  getTools() {
    return [
      {
        name: "get_sdd_report",
        description: "Get the project's Seam-Driven Development compliance report.",
        inputSchema: {
          type: "object",
          properties: { agentId: { type: "string" } },
          required: ["agentId"]
        }
      },
      {
        name: "scaffold_seam",
        description: "Scaffold a new SDD seam (Contract, Probe, Mock, Test, Adapter).",
        inputSchema: {
          type: "object",
          properties: {
            seamName: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["seamName", "agentId"]
        }
      },
      {
        name: "run_probe",
        description: "Run executable probes to verify environment and refresh fixtures.",
        inputSchema: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Glob or substring pattern for probe files." },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      }
    ];
  }

  getHandlers(): Record<string, ToolHandler> {
    return {
      get_sdd_report: async (args) => {
        z.object({ agentId: z.string() }).parse(args);
        return await this.sdd.getReport();
      },
      scaffold_seam: async (args) => {
        const input = z.object({ seamName: z.string(), agentId: z.string() }).parse(args);
        // Senior Mandate: Use PathGuard root for scaffolding
        return await this.scaffolder.scaffold({ 
          seamName: input.seamName, 
          baseDir: this.pathGuard.getRootDir() 
        });
      },
      run_probe: async (args) => {
        const input = z.object({ pattern: z.string().optional(), agentId: z.string() }).parse(args);
        return await this.probeRunner.run({ pattern: input.pattern ?? "" });
      }
    };
  }
}
