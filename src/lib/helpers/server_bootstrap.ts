import path from "path";
import os from "os";
import fs from "fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Helpers
import { ToolRegistry, ToolExecutor } from "./tool_registry.js";
import { PathGuard } from "./path_guard.js";

// Adapters
import { StoreAdapter } from "../adapters/store.adapter.js";
import { LockerAdapter } from "../adapters/locker.adapter.js";
import { TaskAdapter } from "../adapters/tasks.adapter.js";
import { DependencyAdapter } from "../adapters/dependency.adapter.js";
import { SchedulerAdapter } from "../adapters/scheduler.adapter.js";
import { KnowledgeAdapter } from "../adapters/knowledge.adapter.js";
import { AdrAdapter } from "../adapters/adr.adapter.js";
import { IdeaAdapter } from "../adapters/ideas.adapter.js";
import { MessageAdapter } from "../adapters/messages.adapter.js";
import { EventStreamAdapter } from "../adapters/event_stream.adapter.js";
import { NotificationAdapter } from "../adapters/notifications.adapter.js";
import { ConfidenceAuctionAdapter } from "../adapters/confidence_auction.adapter.js";
import { MoodAdapter } from "../adapters/mood.adapter.js";
import { ArbitrationAdapter } from "../adapters/arbitration.adapter.js";
import { ReviewGateAdapter } from "../adapters/review_gate.adapter.js";
import { AgentAdapter } from "../adapters/agents.adapter.js";
import { StatusAdapter } from "../adapters/status.adapter.js";
import { AuditAdapter } from "../adapters/audit.adapter.js";
import { ProbeRunnerAdapter } from "../adapters/probe_runner.adapter.js";
import { ScaffolderAdapter } from "../adapters/scaffolder.adapter.js";
import { SddTrackingAdapter } from "../adapters/sdd_tracking.adapter.js";

// Providers
import { ManagementProvider } from "../providers/management.provider.js";
import { IntelligenceProvider } from "../providers/intelligence.provider.js";
import { InfrastructureProvider } from "../providers/infrastructure.provider.js";
import { CommunicationProvider } from "../providers/communication.provider.js";
import { MetaProvider } from "../providers/meta.provider.js";
import { DevInfraProvider } from "../providers/dev_infra.provider.js";

/**
 * Purpose: Centralized wiring harness for the MCP Server (infrastructure seam).
 * Hardened: Encapsulates all DI, environment resolution, and signal handling.
 */
export class ServerBootstrap {
  private readonly rootDir: string;
  private readonly storePath: string;
  private readonly server: Server;
  private readonly registry: ToolRegistry;

  constructor() {
    this.rootDir = process.cwd();
    this.storePath = process.env.MCP_STORE_PATH || path.join(os.homedir(), ".mcp-collaboration", "store.json");
    this.registry = new ToolRegistry();
    
    this.server = new Server(
      { name: "mcp-collaboration-server", version: "1.1.2" },
      { capabilities: { tools: {} } }
    );

    this.ensureEnvironment();
  }

  async start(): Promise<void> {
    const { executor, registry } = this.wire();

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: registry.getTools()
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const handler = registry.getHandlers()[name];
      if (!handler) throw new Error(`Unknown tool: ${name}`);

      try {
        const result = await executor.execute(name, handler, args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { 
          content: [{ type: "text", text: `ERROR [${err.code || "UNKNOWN"}]: ${err.message}` }], 
          isError: true 
        };
      }
    });

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`[MCP] Server Live. Store: ${this.storePath}`);
    
    this.setupSignalHandlers();
  }

  private wire() {
    const pathGuard = new PathGuard(this.rootDir);
    const store = new StoreAdapter(this.storePath, pathGuard);
    const agents = new AgentAdapter(store);
    const audit = new AuditAdapter(store);
    const executor = new ToolExecutor(agents, audit);

    // Register Suites
    this.registry.register(new ManagementProvider(new TaskAdapter(store), new DependencyAdapter(store), new SchedulerAdapter()));
    this.registry.register(new IntelligenceProvider(new KnowledgeAdapter(store), new AdrAdapter(store), new IdeaAdapter(store)));
    this.registry.register(new InfrastructureProvider(new LockerAdapter(store, path.join(this.rootDir, "fixtures/locker/capabilities.json")), agents, new StatusAdapter(store), audit, pathGuard));
    this.registry.register(new CommunicationProvider(new MessageAdapter(store), new EventStreamAdapter(store), new NotificationAdapter(store)));
    this.registry.register(new MetaProvider(new ReviewGateAdapter(store), new ArbitrationAdapter(store), new MoodAdapter(store), new ConfidenceAuctionAdapter()));
    this.registry.register(new DevInfraProvider(new SddTrackingAdapter(this.rootDir), new ScaffolderAdapter(pathGuard), new ProbeRunnerAdapter(this.rootDir), pathGuard));

    return { executor, registry: this.registry };
  }

  private ensureEnvironment() {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  private setupSignalHandlers() {
    const shutdown = () => {
      console.error("[MCP] Shutting down cleanly...");
      process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }
}
