/**
 * Purpose: Simulate TUI chat and health states to generate fixtures (tui seam).
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// --- Types (to be mirrored in contracts) ---

type Author = 'Gemini' | 'Codex' | 'System';
type Target = 'left' | 'right' | 'broadcast';
type Pane = 'left' | 'right';
type Role = 'leader' | 'follower' | 'none';

interface TuiChatMessage {
  id: string;
  timestamp: number;
  author: Author;
  content: string;
  pane: Pane;
  target: Target;
  role: Role;
  metadata: {
    broadcastHeader?: string;
    waitingForAgentId?: string;
  };
}

interface SeamHealth {
  status: 'healthy' | 'degraded' | 'failed' | 'synced' | 'stale';
  latencyMs?: number;
  bufferUsage?: number;
  driftMs?: number;
  lastResult?: 'success' | 'error';
  lastError?: string;
}

interface TuiHealthSnapshot {
  persistence: SeamHealth;
  telemetry: SeamHealth;
  state: SeamHealth;
  command: SeamHealth;
}

interface TuiScenario {
  history: TuiChatMessage[];
  health: TuiHealthSnapshot;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.join(__dirname, '../../fixtures/tui/chat_simulation.json');

// --- Generators ---

function createMessage(
  author: Author, 
  content: string, 
  pane: Pane, 
  target: Target = 'left', 
  role: Role = 'none',
  waitingFor?: string
): TuiChatMessage {
  return {
    id: uuidv4(),
    timestamp: Date.now(),
    author,
    content,
    pane,
    target,
    role,
    metadata: {
      waitingForAgentId: waitingFor
    }
  };
}

const defaultHealth: TuiHealthSnapshot = {
  persistence: { status: 'healthy', latencyMs: 5 },
  telemetry: { status: 'healthy', bufferUsage: 12 },
  state: { status: 'synced', driftMs: 100 },
  command: { status: 'healthy', lastResult: 'success' }
};

// --- Scenarios ---

const scenarios: Record<string, TuiScenario> = {
  idle: {
    history: [
      createMessage('System', 'Welcome to MCP Mission Control.', 'left'),
      createMessage('System', 'Connected to server rev: 42.', 'right')
    ],
    health: defaultHealth
  },

  broadcast_waiting: {
    history: [
      {
        ...createMessage('System', 'User: "Optimize the store adapter."', 'left', 'broadcast'),
        metadata: { broadcastHeader: 'BROADCAST -> ALL' }
      },
      {
        ...createMessage('System', 'User: "Optimize the store adapter."', 'right', 'broadcast'),
        metadata: { broadcastHeader: 'BROADCAST -> ALL' }
      },
      createMessage('Gemini', 'I am analyzing the current implementation.', 'left', 'left', 'leader'),
      createMessage('Codex', 'Waiting for leader response.', 'right', 'right', 'follower', 'Gemini')
    ],
    health: defaultHealth
  },

  leader_response: {
    history: [
      createMessage('Gemini', 'Analysis complete. I will implement the atomic rename pattern.', 'left', 'left', 'leader'),
      createMessage('Codex', 'Acknowledged. I will review the plan.', 'right', 'right', 'follower')
    ],
    health: defaultHealth
  },

  dual_pane_history: {
    history: Array.from({ length: 50 }).map((_, i) => 
      createMessage(
        i % 2 === 0 ? 'Gemini' : 'Codex',
        `Message ${i}: This is a high-volume test message to verify scroll performance and pane separation.`,
        i % 2 === 0 ? 'left' : 'right'
      )
    ),
    health: {
      ...defaultHealth,
      telemetry: { status: 'degraded', bufferUsage: 85 }
    }
  },

  stale_state: {
    history: [
      createMessage('System', 'Connectivity issues detected.', 'left')
    ],
    health: {
      ...defaultHealth,
      state: { status: 'stale', driftMs: 18500 }
    }
  },

  panic_mode: {
    history: [
      {
        ...createMessage('System', 'Panic mode enabled.', 'left', 'broadcast'),
        metadata: { broadcastHeader: 'BROADCAST -> ALL' }
      },
      {
        ...createMessage('System', 'Panic mode enabled.', 'right', 'broadcast'),
        metadata: { broadcastHeader: 'BROADCAST -> ALL' }
      }
    ],
    health: {
      ...defaultHealth,
      command: { status: 'failed', lastResult: 'error', lastError: 'PANIC_MODE' }
    }
  },

  command_error: {
    history: [
      createMessage('System', 'Send failed: server offline.', 'left')
    ],
    health: {
      ...defaultHealth,
      command: { status: 'failed', lastResult: 'error', lastError: 'SERVER_OFFLINE' }
    }
  }
};

// --- Execution ---

console.log(`Generating fixtures at: ${FIXTURE_PATH}`);

// Ensure directory exists (handles if __dirname is different in dist)
const dir = path.dirname(FIXTURE_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(FIXTURE_PATH, JSON.stringify(scenarios, null, 2));
console.log('Successfully captured TUI chat simulation fixtures.');
