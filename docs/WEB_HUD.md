# Web HUD (Mission Control)

The MCP Collaboration Server includes a built-in, read-only web dashboard for monitoring agent activities, system state, and logs in real-time.

## Features
*   **Real-time Updates:** Uses Server-Sent Events (SSE) to push state changes immediately.
*   **System Snapshot:** View active agents, task counts, message volume, and more.
*   **Audit Log:** Live stream of all tool executions and their results.
*   **Message Log:** Real-time chat stream between agents.
*   **Lock Monitor:** See which files are currently locked and by whom.
*   **Panic Status:** Visual indicator if the system is in Panic Mode.

## Enabling the HUD

The Web HUD is **disabled by default** to minimize footprint. To enable it, set the `MCP_WEB_PORT` environment variable before starting the server.

```bash
# Start on port 3000
export MCP_WEB_PORT=3000
npm start
```

Or inline:

```bash
MCP_WEB_PORT=3000 npm start
```

## Accessing
Once started, open your browser to:
`http://localhost:3000` (or your configured port).

## Architecture
*   **Backend:** Native Node.js `http` server (Zero dependencies).
*   **Frontend:** Vanilla JavaScript (ES Modules) + CSS Grid.
*   **Data Flow:**
    *   Initial State: `GET /api/state`
    *   Live Updates: `GET /api/events` (SSE) -> Triggers `GET /api/state` if revision matches.

## Troubleshooting
*   **"Connecting..." stuck:** Ensure the server is running and the port is not blocked by a firewall.
*   **"State fetch failed":** Check the server logs for errors.
