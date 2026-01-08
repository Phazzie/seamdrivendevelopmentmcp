# Remaining Work: MCP Collaboration Server

## 1. Core Infrastructure (Phase 4: Meta-Tools)
*   **`scaffold_seam`**: **COMPLETE**.
*   **`run_probe`**: **COMPLETE**.

## 2. Advanced Features (From Spec)
*   **The "Intelligence" Suite**:
    *   **Shared Knowledge Graph**: Persistent repository for project insights/jargon (**COMPLETE**).
    *   **Decision Records (ADR)**: Immutable logs for technical decisions (**COMPLETE**).
*   **The "Management" Suite**:
    *   **Work Distribution (`divvy_work`)**: Tool to split plans into sub-tasks and assign to agents (**COMPLETE**).
    *   **Plan Builder (`build_plan`)**: Converts structured input into canonical Markdown (**COMPLETE**).
    *   **Plan Decomposition (`decompose_plan`)**: Tool to parse plans into tasks (**COMPLETE**).
    *   **Task Dependency Linking (`link_tasks`)**: Adds blocking logic (**COMPLETE**).
*   **The "Meta-Cognition" Suite**:
    *   **Confidence Auction**: Agents bidding on tasks (**COMPLETE**).
    *   **Mood/Confusion Log**: Tracking agent thrashing (**COMPLETE**).
    *   **Human Arbitration**: Specialized "Gavel" state.

*   **The "Communication" Suite**:
    *   **Discussion Channels**: Channelized messaging via `channelId`/`threadId` (**COMPLETE**).
    *   **Real-Time Event Stream**: Agents subscribe to event updates (**COMPLETE**).
    *   **Priority Notifications**: Urgent review interrupts (**COMPLETE**).

## 3. Maintenance & Improvements
*   **Security Fix**: 1 High Severity vulnerability in `@modelcontextprotocol/sdk` (ReDoS) needs monitoring.

## 4. Process Enforcement
*   **Plan Peer Review**: Tooling to *enforce* the critique/revise cycle (e.g., a tool that blocks `create_task` until a plan is `APPROVED`).
