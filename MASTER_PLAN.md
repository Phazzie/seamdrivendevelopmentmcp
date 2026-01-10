# MCP Collaboration Server: Master Plan & Specification

## 1. Project Overview
A stateful Model Context Protocol (MCP) server designed to facilitate high-level collaboration, task delegation, and conflict avoidance between two distinct AI agents (Codex CLI and Gemini CLI) working on the same local codebase.

### Core Technology Stack
*   **Runtime:** Node.js (v18+)
*   **Language:** TypeScript
*   **Protocol:** Model Context Protocol (MCP) via STDIO
*   **Persistence:** Local JSON Storage (`~/.mcp-collaboration/store.json`)
*   **Validation:** Zod for tool input/output integrity

---

## 2. Architecture & Core Patterns

### A. File Reservation System (Locking)
To prevent race conditions, agents must "check out" files before editing.
*   **Mechanism:** `request_file_lock` and `release_file_lock`.
*   **Validation:** The server rejects lock requests for files already held by the other agent.

### B. Leader/Follower Workflow
A structured state machine that forces planning and review before execution.
*   **States:** `PROPOSED` → `DEBATING` → `REVISING` → `APPROVED` → `IN_PROGRESS` → `REVIEW_PENDING` → `COMPLETED`.
*   **Roles:** Dynamic assignment of Leader (Executes) and Follower (Reviews/Critiques/Revises).
*   **Protocol:** Plans must be critiqued by the Follower and optionally revised before Approval.

### C. Panic Button (Circuit Breaker)
A safety mechanism to freeze all operations in case of anomalies.
*   **Triggers:** Manual user command or automated velocity detection (>X files modified in Y seconds).
*   **Action:** Immediate global `403 Forbidden` on all file lock requests and state changes.

---

## 3. Implementation Status (Phased Plan)

### Phase 1: The Foundation (SDD) - **COMPLETE**
*   **Step 1.1: The Store Seam (Persistence):** Implements atomic `fs.rename` patterns and OCC.
*   **Step 1.2: The Lock Manager Seam (Safety):** Implements `requestLocks`, `releaseLocks`, `renewLease`.

### Phase 2: The Collaboration Features - **COMPLETE**
*   **Step 2.1: The Task Registry:** Manage the "ToDo" list (`create_task`, `update_task`).
*   **Step 2.2: The Message Bridge:** Real-time communication and long-polling (`wait_for_update`).

### Phase 3: The Integration - **COMPLETE**
*   **Server:** `src/index.ts` initializes all adapters and registers MCP tools.

### Phase 4: The Meta-Tools (Self-Replication) - **COMPLETE**
*   **Tool:** `scaffold_seam` - Automates the folder creation for future features.
*   **Tool:** `run_probe` - Runs the probes and updates fixtures.

### Phase 5: Mission Control "Cockpit" (TUI V2) - **COMPLETE**
*   **Goal:** A dual-pane, chat-centric dashboard for real-time agent coordination.
*   **Step 5.1: Seams & Contracts:** `tui.contract.ts` and `chat_simulation.ts` probe.
*   **Step 5.2: The View Model:** Pure `deriveViewModel` logic with strict testing.
*   **Step 5.3: The Adapter & UI:** `tui.adapter.ts` mapping to MCP tools, and `cockpit.ts` UI using `blessed`.

### Phase 6: Advanced Suites - **COMPLETE**
*   **Management Suite:** `link_tasks`, `divvy_work`.
*   **Intelligence Suite:** `knowledge_graph`, `adr`.
*   **Communication Suite:** channelized messages, `event_stream`, `priority_notifications`.
*   **Meta-Cognition Suite:** `confidence_auction`, `mood_log`, `human_arbitration`, `devils_advocate`.

---

## 4. Advanced Suites (Implemented)

### The "Intelligence" Suite
*   **Shared Knowledge Graph:** A structured repository for persistent project-specific insights, jargon, and architectural quirks.
*   **Decision Record (ADR):** Immutable logs explaining *why* a specific technical choice was made.
*   **Glossary:** Registry for project-specific domain terms.

### The "Management" Suite
*   **Work Distribution Tool (`divvy_work`):**
    *   **Goal:** Automatically split a large plan/task into sub-tasks.
    *   **Function:** Assign specific sub-tasks to specific agents based on strengths/availability.
    *   **Benefit:** Enables true parallel execution.
*   **Dependency Manager (`link_tasks`):**
    *   **Goal:** Block tasks until prerequisites are complete.
    *   **Function:** Add/remove dependencies and list actionable tasks.
    *   **Benefit:** Prevents out-of-order execution.

### The "Communication" Suite
*   **Discussion Channels:** Dedicated tools for brainstorming (implemented via `Message.channelId`/`threadId`).
*   **Real-Time Event Stream:** Allows agents to subscribe to specific events.
*   **Priority Notifications:** Interrupts for urgent reviews.

### The "Meta-Cognition" Suite
*   **Confidence Auction:** Agents bid on tasks based on capabilities.
*   **Mood/Confusion Log:** Tracking agent "thrashing" to trigger intervention.
*   **Human Arbitration:** A specialized state that pauses automation until a human provides a "Gavel" decision.

---

## 5. Process & Protocols

### Plan Peer Review
*   **Mandate:**
    1.  Agent A submits a plan.
    2.  Agent B reads, critiques, and optionally revises the plan.
    3.  Agents agree to "Discuss Further" or "Approve & Implement".

### Seam-Driven Development (SDD)
*   **Mandate:** No new feature without a Seam, Contract, Probe, Mock, and Test.
*   **Pre-Flight Check:** Explicitly list Seam/Contract/Probe before starting work.
