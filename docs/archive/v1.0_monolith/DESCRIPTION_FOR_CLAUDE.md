> ARCHIVED DOCUMENT: Historical reference only. Not current or authoritative. See `docs/SDD_MASTER_GUIDE.md`, `docs/THE_LAW.md`, `AGENTS.md`, and `README.md`.

# MCP Collaboration Server: Project Briefing for Claude

**Status:** Feature Complete (100% Roadmap), Healthy (SDD Compliant), Maintenance Mode.
**Core Philosophy:** Seam-Driven Development (SDD) & Multi-Agent Collaboration.

---

## 1. Project Identity & Purpose
This is a **stateful Model Context Protocol (MCP) server** designed to be the "Shared Brain" and "Collaboration OS" for two distinct AI agents (Codex & Gemini) working on the same local codebase. It prevents race conditions, enforces architectural discipline, and provides tools for high-level reasoning.

**Key Problem Solved:** AI agents typically lack persistent shared state, leading to "amnesiac" collaboration where they overwrite each other's work or forget architectural decisions. This server provides that persistence.

---

## 2. Core Architecture: The "Seam" Pattern
The project is strictly built using **Seam-Driven Development (SDD)**. Every feature is an isolated "Seam" composed of 5 artifacts:
1.  **Contract (`contracts/*.contract.ts`):** Zod schemas defining the interface.
2.  **Probe (`probes/*.probe.ts`):** An executable script that tests "reality" (e.g., how `fs.watch` *actually* behaves on macOS) and captures a JSON fixture.
3.  **Fixture (`fixtures/*.json`):** A timestamped snapshot of reality. **CRITICAL:** These expire every 7 days. If a fixture is stale, the build fails.
4.  **Mock (`src/lib/mocks/*.mock.ts`):** A test double that *must* load the fixture. No "magic strings" allowed.
5.  **Adapter (`src/lib/adapters/*.adapter.ts`):** The real implementation.

**Why this matters:** It allows us to test complex side-effects (like file locking or terminal UIs) deterministically without flakiness.

---

## 3. Capabilities & Tools
The server exposes these MCP tools to agents:

### 🛡️ Core Infrastructure
-   **File Locking (`request_file_locks`):** Prevents race conditions. Agents must check out files before editing.
-   **Task Registry (`create_task`, `list_tasks`):** A persistent Kanban board.
-   **Message Bridge (`post_message`):** Persistent chat logs with thread/channel support.
-   **Agents (`whoami`, `register_agent`):** Identity management.

### 🧠 Intelligence Suite
-   **Knowledge Graph (`knowledge_add_node`):** A graph database embedded in `store.json` for storing concepts, jargon, and architectural facts.
-   **Decision Records (`create_adr`):** Immutable log of "Why we did this".

### ⚙️ Management Suite
-   **Dependency Tracker (`add_dependency`):** Blocks tasks (`blockedBy`) until prerequisites are done.
-   **Scheduler (`divvy_work`):** Algorithmic assignment of tasks based on agent roles.

### 📡 Communication Suite
-   **Event Stream (`publish_event`, `subscribe_to_events`):** Real-time pub/sub.
-   **Notifications (`send_notification`):** Priority interrupts.

### 🔮 Meta-Cognition Suite (Advanced)
-   **Confidence Auction (`resolve_confidence_auction`):** Agents bid on tasks based on their confidence/capability.
-   **Mood Log (`log_mood`):** Agents self-report confusion/frustration. If "confused" x3, the system triggers a "Panic".
-   **Human Arbitration (`request_gavel`):** Pauses all automation for human review.
-   **Review Gate (`submit_plan`, `submit_critique`):** Enforces a "Devil's Advocate" protocol where plans must be critiqued before approval.

### 🛠️ Meta-Tools (Self-Maintenance)
-   **`scaffold_seam`:** Generates the 5 SDD artifacts for a new feature.
-   **`run_probe`:** Runs probes to refresh stale fixtures.

---

## 4. Current Workflows (Protocols)

### The "Devil's Advocate" Protocol (Proposed V1)
1.  **Plan:** Agent A submits a plan.
2.  **Auction:** Agents bid confidence.
3.  **Critique:** The *lowest* bidder must critique the plan (acting as Devil's Advocate).
4.  **Defense:** The *highest* bidder defends it.
5.  **Approval:** Only then can the plan be approved.

### The Maintenance Loop
1.  **Audit:** `npm run sdd:check` runs on every CI/pre-commit.
2.  **Fail:** If fixtures are >7 days old, it fails.
3.  **Fix:** Agent runs `npm run probes` to re-verify reality and update timestamps.

---

## 5. Challenges & Lessons Learned
-   **Probe Path Resolution:** We struggled with `tsc` output paths when compiling individual probes. **Fix:** Use `--rootDir .` to preserve structure.
-   **Ghost Fixtures:** Probes were writing to `dist/fixtures` instead of source `fixtures/`. **Fix:** Use `process.cwd()` instead of `__dirname`.
-   **Mock Grounding:** Mocks must explicitly reference the fixture file path to pass the linter.
-   **SDD Discipline:** It feels slow initially (5 files per feature), but it prevented massive regression when we refactored the Store.

---

## 6. Future Improvement Ideas
1.  **Workflow Engine (Planned):** A formal state machine (contract defined) to enforce the "Devil's Advocate" protocol programmatically, preventing agents from bypassing the critique phase.
2.  **Telemetry Seam:** Currently we mock buffer status. We need a real log-tailing implementation for the TUI.
3.  **TUI V3:** Interactive dashboard with mouse support (currently keyboard-driven).
4.  **Vector Store:** Replace the simple Knowledge Graph with an embedded vector database for semantic search.

---

## 7. How to Operate
-   **Start:** `npm start` (Runs the MCP server over STDIO).
-   **Cockpit:** `npm run tui` (Launches the terminal dashboard).
-   **Verify:** `npm run sdd:check` (Audits fixtures/mocks).
-   **Refresh:** `npm run probes` (Updates fixtures).

This project is a high-discipline environment. **Do not cut corners on SDD.**
