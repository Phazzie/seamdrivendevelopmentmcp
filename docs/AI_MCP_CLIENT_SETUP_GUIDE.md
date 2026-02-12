# AI Client Setup Guide (Connect to This MCP Server)

Use this guide to connect AI clients to this repo's MCP collaboration server.

Repo path used below:
- `/Users/hbpheonix/mcp-collaboration-server`

Server entrypoint:
- `node /Users/hbpheonix/mcp-collaboration-server/dist/src/index.js`

Optional server env vars:
- `MCP_STORE_PATH` (shared state file)
- `MCP_WEB_PORT` (enables Web HUD)
- `MCP_AGENT_MODEL` (server-assigned model identity; default is `User`)

## 1) Build once

```bash
cd /Users/hbpheonix/mcp-collaboration-server
npm install --cache .npm-cache
npx tsc -p tsconfig.json
```

## 2) Pick one shared store path (recommended)

If multiple AIs should collaborate on the same chamber state, point all clients at the same file:

```bash
export MCP_STORE_PATH=/Users/hbpheonix/Projects/mcp-collab-store.json
```

You will add that same path in each client config block below.

## 3) Client config files to edit

### A) Codex CLI
Edit:
- `~/.codex/config.toml`

Add:
```toml
[mcp_servers.mcp-collab]
command = "node"
args = ["/Users/hbpheonix/mcp-collaboration-server/dist/src/index.js"]

[mcp_servers.mcp-collab.env]
MCP_STORE_PATH = "/Users/hbpheonix/Projects/mcp-collab-store.json"
MCP_AGENT_MODEL = "Codex"
```

Verify in Codex:
```text
/mcp
```

### B) Gemini CLI
Edit one of:
- User scope: `~/.gemini/settings.json`
- Project scope: `.gemini/settings.json`

Add:
```json
{
  "mcpServers": {
    "mcp-collab": {
      "command": "node",
      "args": ["/Users/hbpheonix/mcp-collaboration-server/dist/src/index.js"],
      "env": {
        "MCP_STORE_PATH": "/Users/hbpheonix/Projects/mcp-collab-store.json",
        "MCP_AGENT_MODEL": "Gemini"
      }
    }
  }
}
```

Or via CLI:
```bash
gemini mcp add -s user mcp-collab node /Users/hbpheonix/mcp-collaboration-server/dist/src/index.js
```
Then manually add env values in the same settings file.

Verify:
```bash
gemini mcp list
```
and inside session:
```text
/mcp
```

### C) Claude Desktop
Edit:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`

Add:
```json
{
  "mcpServers": {
    "mcp-collab": {
      "command": "node",
      "args": ["/Users/hbpheonix/mcp-collaboration-server/dist/src/index.js"],
      "env": {
        "MCP_STORE_PATH": "/Users/hbpheonix/Projects/mcp-collab-store.json",
        "MCP_AGENT_MODEL": "Claude"
      }
    }
  }
}
```

Restart Claude Desktop after editing.

## 4) First actions each AI should run

On connect, tell each AI to:
1. Call `register_agent` with a unique alias (not model name), for example:
   - `{ "name": "Lil Tokenizer" }`
2. Call `get_status`.
3. Call `list_tasks` and `list_locks`.

Important:
- Agents choose their own session alias via `register_agent.name`.
- Model identity is assigned server-side using `MCP_AGENT_MODEL` and cannot be set by tool input.

## 5) Quick troubleshooting

- If tools do not appear, run `npx tsc -p tsconfig.json` again and restart the client.
- Confirm config path/JSON/TOML syntax is valid.
- Confirm absolute path is used for `dist/src/index.js`.
- Confirm `MCP_STORE_PATH` points to the same file across all clients.
- For Claude Desktop logs (macOS): `~/Library/Logs/Claude`.

## 6) Minimal handoff prompt you can send to any AI

```text
Connect to MCP server "mcp-collab".
Register yourself with `register_agent` using a unique alias name (not model name).
Then run: `get_status`, `list_tasks`, and `list_locks`.
Follow AGENTS.md workflow: submit_plan -> request_file_locks -> implement -> verify -> release_file_locks.
```

