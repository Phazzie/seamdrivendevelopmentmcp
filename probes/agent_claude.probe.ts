/**
 * Purpose: Verify that 'Claude' is a valid, registerable agent identity (agent_identity seam).
 */
import fs from 'fs';
import path from 'path';
import { AgentAdapter } from '../src/lib/adapters/agents.adapter.js';
import { StoreAdapter } from '../src/lib/adapters/store.adapter.js';

const FIXTURE_DIR = path.join(process.cwd(), 'fixtures/agents');
const FIXTURE_FILE = path.join(FIXTURE_DIR, 'claude_identity.json');
const STORE_FILE = path.join(process.cwd(), 'probes/tmp_claude_store.json');

// Ensure fixture dir
if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  // Use a temporary store to avoid polluting the real one
  const store = new StoreAdapter(STORE_FILE);
  const agents = new AgentAdapter(store);

  try {
    console.log("Attempting to register 'Claude'...");
    const agent = await agents.register("Claude");
    
    console.log(`Success! Registered Agent: ${agent.name} (${agent.id})`);

    const fixture = {
      ...agent,
      captured_at: new Date().toISOString()
    };

    fs.writeFileSync(FIXTURE_FILE, JSON.stringify(fixture, null, 2));
    console.log(`Fixture written to ${FIXTURE_FILE}`);

  } catch (err) {
    console.error("Probe Failed:", err);
    process.exit(1);
  } finally {
    if (fs.existsSync(STORE_FILE)) fs.unlinkSync(STORE_FILE);
  }
}

main();
