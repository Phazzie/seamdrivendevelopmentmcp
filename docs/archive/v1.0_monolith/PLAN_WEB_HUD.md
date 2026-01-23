> ARCHIVED DOCUMENT: Historical reference only. Not current or authoritative. See `docs/SDD_MASTER_GUIDE.md`, `docs/THE_LAW.md`, `AGENTS.md`, and `README.md`.

# PLAN_WEB_HUD.md - The "Shadow Web" Cockpit

**Goal:** Provide a high-fidelity, real-time dashboard for the MCP server without the limitations of a terminal UI.

## Phase 1: The Core Seam (Architecture)

### 1.1 Seam Definition: `web_cockpit`
- **Contract:** `contracts/web_cockpit.contract.ts`
    - `start(port: number): Promise<string>` (Returns URL)
    - `stop(): Promise<void>`
- **Probe:** `probes/http_server.probe.ts`
    - Verify we can bind to a port and serve static content.
- **Mock:** `src/lib/mocks/web_cockpit.mock.ts`
- **Adapter:** `src/lib/adapters/web_cockpit.adapter.ts`
    - Uses Node.js native `http` or `express` (if allowed). *Recommendation: Native `http` for zero-dep.*

## Phase 2: The API Layer

### 2.1 JSON Endpoints
The adapter will expose read-only endpoints mapping to existing MCP tools:
- `GET /api/status` -> `status.getStatus()`
- `GET /api/tasks` -> `tasks.list()`
- `GET /api/messages` -> `messages.list()`
- `GET /api/sdd` -> `sdd.getReport()`
- `GET /api/pulse?since=REV` -> `store.waitForRevision(since)` (Long Poll)

## Phase 3: The Frontend (Vanilla)

### 3.1 Static Assets (`public/`)
- `index.html`: A single-page layout (Grid).
- `app.js`: A specialized `StateController` class (Client-side) that connects to `/api/pulse`.
- `style.css`: Minimal CSS (CSS Grid/Flexbox).

### 3.2 Features
- **Task Board:** 3 Columns (Todo, Doing, Done).
- **Chat Stream:** Auto-scrolling log.
- **Shield:** Visual SDD compliance indicator.

## Phase 4: Integration

### 4.1 Wiring
- Update `src/index.ts` to start the Web Cockpit on `localhost:3000` (configurable via env).

## Mandate Compliance Check
- [x] **No Magic Strings:** `public/` directory path must be injected into the adapter.
- [x] **Async IO:** All file serving must use `fs.promises`.
- [x] **Event-Driven:** Frontend uses Long-Polling (`/api/pulse`), no `setInterval`.
- [x] **Safety:** Read-Only. No mutations allowed via HTTP yet.
