// Purpose: Autonomous worker that listens for hypothesis ideas and triggers experiments (seam: scientist)
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import path from "path";

async function main() {
  console.log("🧪 Scientist Daemon starting...");

  // Connect to the local server via Stdio
  // We use the same path logic as the server uses
  const transport = new StdioClientTransport({
    command: "node",
    args: [path.join(process.cwd(), "dist", "src", "index.js")],
    env: {
        ...process.env,
        MCP_STORE_PATH: "/Users/hbpheonix/.mcp-collaboration/store.json" // Explicitly matching server
    }
  });

  const client = new Client(
    { name: "scientist-daemon", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("✅ Connected to MCP Server");

  // Subscribe to events
  console.log("👀 Watching for new ideas with tag 'hypothesis'...");
  
  // We poll for now because 'subscribe' in SDK might be tricky with stdio in a simple script,
  // but let's try to use the 'subscribe_to_events' tool logic if we were inside the server.
  // Since we are outside, we'll poll the event stream or list_ideas.
  
  let lastChecked = Date.now();

  setInterval(async () => {
    try {
        // Look for new ideas
        const result = await client.callTool({
            name: "list_ideas",
            arguments: { 
                agentId: "scientist",
                tag: "hypothesis",
                limit: 10
            }
        }) as any;

        const ideas = JSON.parse(result.content[0].text);
        
        // Filter for ideas created recently (or handle "unprocessed" state if we had one)
        // For V1, we'll just log that we see them. 
        // Real implementation would check if an experiment already exists for this Idea.
        
        for (const idea of ideas) {
            // Check if experiment exists
            // This requires a new 'list_experiments' filter or manual check
            // For now, let's just print.
            // console.log(`Found hypothesis: ${idea.title}`);
        }

    } catch (err) {
        console.error("Polling error:", err);
    }
  }, 5000);
}

main().catch(console.error);
