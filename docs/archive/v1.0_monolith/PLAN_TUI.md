> ARCHIVED DOCUMENT: Historical reference only. Not current or authoritative. See `docs/SDD_MASTER_GUIDE.md`, `docs/THE_LAW.md`, `AGENTS.md`, and `README.md`.

# Improved TUI Rebuild Plan: "The Cockpit" (SDD)

Based on Codex's updated requirements for a dual-pane, chat-centric interface with broadcast capabilities.

## 1. Architectural Seams & Contracts
*   **Seam 1: The Chat Transport**
    *   **Goal:** Unified interface for sending/receiving messages to specific agents or broadcasting to both.
    *   **Contract:** `contracts/tui.contract.ts` (Update `TuiCommandSchema` to include `send_message` with `target: 'gemini' | 'codex' | 'broadcast'`).
*   **Seam 2: The View Model (State)**
    *   **Goal:** Deterministic state container for the UI.
    *   **Contract:** `contracts/tui.contract.ts` (Update `TuiViewModel` to include `panes: { left: AgentState, right: AgentState }` and `input: { target: string }`).
*   **Seam 3: The Telemetry (Logs/Health)**
    *   **Goal:** Stream logs and health metrics without coupling to FS.
    *   **Contract:** Existing `TuiLogStreamSchema`.

## 2. SDD Implementation Plan (Strict Order)

### Step 2.1: Scaffolding & Probes (Pre-Flight)
*   **Action:** Create `probes/tui/chat_simulation.ts`.
*   **Goal:** Verify how `blessed` handles rapid interleaved writes to two scrollable boxes.
*   **Artifact:** `fixtures/tui/chat_history.json` (captured real or synthetic conversation).

### Step 2.2: The "Chat" Adapter
*   **Mock:** `src/tui/adapters/__mocks__/chat.adapter.ts`.
    *   Simulate `sendMessage(target, content)`.
    *   Simulate `on('message', callback)` with artificial delays to test "Follower Waiting" logic.
*   **Test:** `tests/contract/tui_chat.test.ts`.
    *   Verify `broadcast` creates two distinct message events.
    *   Verify "Follower" status updates (e.g., "Waiting for Leader...").

### Step 2.3: The View Model Logic
*   **File:** `src/tui/logic/view_model.ts` (Pure function).
*   **Test:** `tests/unit/view_model.test.ts`.
    *   Input: Raw Store State + Chat History.
    *   Output: `TuiViewModel`.
    *   Case: Ensure `health` metrics are correctly calculated from the Store.

### Step 2.4: The UI Layer (Blessed)
*   **File:** `tools/mission-control/v2/index.js`.
*   **Constraint:** No logic here. Just `viewModel.render(data)`.
*   **Components:**
    *   `LeftPane` (Gemini), `RightPane` (Codex).
    *   `InputBar` (with Target Toggle `[TAB]`).
    *   `HealthBar` (Top fixed header).

## 3. Work Distribution
*   **Gemini (Me):**
    *   Implement Probes & Fixtures (`probes/tui/`).
    *   Implement View Model Logic & Unit Tests.
*   **Codex:**
    *   Update `contracts/tui.contract.ts`.
    *   Implement `ChatAdapter` & Transport Layer.
    *   Build the `blessed` layout.

## 4. Next Actions
1.  **Gemini:** Run `probes/tui/chat_simulation.ts` to generate fixtures.
2.  **Codex:** Update Contract with new `Chat` schemas.
