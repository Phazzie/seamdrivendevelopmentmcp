# Remaining Work: MCP Collaboration Server

## 1. Core Infrastructure (Phase 4: Meta-Tools)
*   **`scaffold_seam`**: **COMPLETE**.
*   **`run_probe`**: **COMPLETE**.

## 2. Advanced Features (From Spec)
*   **The "Intelligence" Suite**:
    *   **Shared Knowledge Graph**: Persistent repository for project insights/jargon.
    *   **Decision Records (ADR)**: Immutable logs for technical decisions.
*   **The "Management" Suite**:
    *   **Work Distribution (`divvy_work`)**: Tool to split plans into sub-tasks and assign to agents.
    *   **Plan Builder (`build_plan`)**: Converts structured input into canonical Markdown (**COMPLETE**).
    *   **Plan Decomposition (`decompose_plan`)**: Tool to parse plans into tasks (**COMPLETE**).
    *   **Task Dependency Linking (`link_tasks`)**: Adds blocking logic.
*   **The "Meta-Cognition" Suite**:
    *   **Confidence Auction**: Agents bidding on tasks.
    *   **Mood/Confusion Log**: Tracking agent thrashing.
    *   **Human Arbitration**: Specialized "Gavel" state.

## 3. Maintenance & Improvements
*   **Security Fix**: 1 High Severity vulnerability in `@modelcontextprotocol/sdk` (ReDoS) needs monitoring.

## 4. Process Enforcement
*   **Plan Peer Review**: Tooling to *enforce* the critique/revise cycle (e.g., a tool that blocks `create_task` until a plan is `APPROVED`).
