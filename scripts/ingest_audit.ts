
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { TaskAdapter } from "../src/lib/adapters/tasks.adapter.js";
import { MessageAdapter } from "../src/lib/adapters/messages.adapter.js";
import path from "path";
import os from "os";

const HOME_DIR = os.homedir();
const STORE_PATH = path.join(HOME_DIR, ".mcp-collaboration", "store.json");

async function main() {
  console.log(`Ingesting Audit into Store at: ${STORE_PATH}`);
  
  const store = new StoreAdapter(STORE_PATH);
  const tasks = new TaskAdapter(store);
  const messages = new MessageAdapter(store);

  // 1. Post Audit Summary
  const auditSummary = `
# 🚨 Audit Findings (2026-01-09)

**Status:** Core App is Green (155 tests), but Infrastructure is Degraded.

**Critical Gaps:**
1. **Probe Runner:** Missing CLI & MCP integration (blocks SDD).
2. **Fixtures:** 9 stale/missing fixtures (failing SDD check).
3. **Docs:** README.md is empty.

**Action Plan:**
We must repair the "Meta-Tools" layer immediately to restore SDD compliance.
`;

  await messages.post("Gemini (Auditor)", auditSummary, { channelId: "general" });
  console.log("✅ Posted Audit Summary to Chat");

  // 2. Create Tasks
  const workItems = [
    {
      title: "Repair Probe Runner Tooling",
      description: "Create src/tools/probes.ts and add 'npm run probes' script. Essential for refreshing fixtures.",
      assignee: "Gemini"
    },
    {
      title: "Expose Meta-Tools via MCP",
      description: "Register 'run_probe' and 'scaffold_seam' in src/index.ts. Required by Handoff agreement.",
      assignee: "Codex" 
    },
    {
      title: "Refresh Stale Fixtures",
      description: "Run 'npm run probes' to update the 9 failing fixtures identified in the audit. Blocks SDD Compliance.",
      assignee: "Gemini"
    },
    {
      title: "Create README.md",
      description: "Write entry-point documentation: Setup, Architecture Summary, and Command Reference.",
      assignee: "Gemini"
    }
  ];

  for (const item of workItems) {
    await tasks.create(item.title, item.description, item.assignee);
    console.log(`✅ Created Task: ${item.title}`);
  }

}

main().catch(console.error);
