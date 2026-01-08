> **⚠️ ARCHIVED: This document is deprecated.**
> **Please refer to [MASTER_PLAN.md](./MASTER_PLAN.md) for the active documentation.**

# MCP Collaboration Server: "The Shared Brain"
## Project Specification & Technical Requirements

### 1. Project Overview
A stateful Model Context Protocol (MCP) server designed to facilitate high-level collaboration, task delegation, and conflict avoidance between two distinct AI agents (Codex CLI and Gemini CLI) working on the same local codebase.

### 2. Primary Technology Stack
*   **Runtime:** Node.js (v18+)
*   **Language:** TypeScript
*   **Protocol:** Model Context Protocol (MCP) via STDIO
*   **Persistence:** Local JSON Storage (`collaboration_store.json`)
*   **Validation:** Zod for tool input/output integrity

---

### 3. Core Architectural Patterns

#### A. File Reservation System (Locking)
To prevent race conditions, agents must "check out" files before editing.
*   **Mechanism:** `request_file_lock` and `release_file_lock`.
*   **Validation:** The server rejects lock requests for files already held by the other agent.

#### B. Leader/Follower Workflow
A structured state machine that forces planning and review before execution.
*   **States:** `PROPOSED` → `DEBATING` → `REVISING` → `APPROVED` → `IN_PROGRESS` → `REVIEW_PENDING` → `COMPLETED`.
*   **Roles:** Dynamic assignment of Leader (Executes) and Follower (Reviews/Critiques/Revises).
*   **Protocol:** Plans must be critiqued by the Follower and optionally revised before Approval.

#### C. Panic Button (Circuit Breaker)
A safety mechanism to freeze all operations in case of anomalies.
*   **Triggers:** Manual user command or automated velocity detection (>X files modified in Y seconds).
*   **Action:** Immediate global `403 Forbidden` on all file lock requests and state changes.

---

### 4. Advanced Toolsets

#### The "Intelligence" Suite
*   **Shared Knowledge Graph:** A structured repository for persistent project-specific insights, jargon, and architectural quirks.
*   **Decision Record (ADR):** Immutable logs explaining *why* a specific technical choice was made.
*   **Glossary:** Registry for project-specific domain terms.

#### The "Management" Suite
*   **Work Distribution (`divvy_work`):** Automatically splits plans into sub-tasks and assigns them to agents based on load/capability.

#### The "Communication" Suite
*   **Discussion Channels:** Dedicated `start_discussion` and `reply_to_discussion` tools for brainstorming that doesn't fit into a specific task ticket.
*   **Real-Time Event Stream:** A `subscribe_to_events` tool that allows agents to poll for recent actions (locks, comments, status changes) to react dynamically to their partner.
*   **Priority Notifications:** `send_notification` ensures urgent alerts (e.g., "Review My Code Now") are prioritized in the receiving agent's context window.

#### The "Meta-Cognition" Suite
*   **Confidence Auction:** Agents bid on tasks based on their context window and capability.
*   **Mood/Confusion Log:** Tracking agent "thrashing" to suggest user intervention.
*   **Human Arbitration:** A specialized state that pauses automation until the user provides a "Gavel" decision.
*   **The Devil's Advocate:** One agent *must* find flaws in a proposal before it can be approved.

---

### 5. Success Criteria
1.  **Zero-Conflict Execution:** No two agents modify the same file simultaneously.
2.  **Auditability:** Every code change is linked to an `APPROVED` plan and a `REVIEWED` task.
3.  **Context Persistence:** A new agent joining the project can read the Knowledge Graph and understand the current "Vibe" and "Plan."
4.  **Safety:** The Panic Button successfully halts a simulated "hallucination spiral."