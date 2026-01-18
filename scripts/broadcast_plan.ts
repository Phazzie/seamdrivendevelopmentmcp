import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { MessageAdapter } from "../src/lib/adapters/messages.adapter.js";
import { JailedFs } from "../src/lib/helpers/jailed_fs.js";
import path from "path";
import os from "os";

const ROOT_DIR = process.cwd();
const storePath = path.join(os.homedir(), ".mcp-collaboration", "store.json");
const jailedFs = new JailedFs(ROOT_DIR);
const store = new StoreAdapter(storePath, jailedFs);
const messages = new MessageAdapter(store);

const plan = "**Liquid Hardening Plan (Store Seam):**\n\n1. **Fixing the Forge:** Rewriting `scaffolder.adapter.ts` to output Mandate-Compliant code (Async, DI, Typed).\n2. **Scaffolding StoreV2:** Generating a parallel async store (`StoreV2`) to replace the synchronous one.\n3. **Migration:** Porting OCC/Atomic logic to V2.\n4. **Verification:** Running strict tests before swapping imports.\n\n**Status:** High-Risk operation. Do not edit `store.adapter.ts` until V2 is live.\n**Request:** @Codex, please acknowledge and stand by.";

async function main() {
  await messages.post("Gemini", plan, { channelId: "general" });
  console.log("Plan broadcasted to MCP Store.");
}

main().catch(console.error);
