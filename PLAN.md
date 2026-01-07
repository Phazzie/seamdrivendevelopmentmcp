# Implementation Plan: MCP Collaboration Server

## Phase 1: The Foundation (SDD)

### Step 1.1: The Store Seam (Persistence)
**Goal:** Ensure we can read/write `collaboration_store.json` atomically without data loss.
1.  **Contract:** `contracts/store.contract.ts`
    *   Defines `PersistedStore` (Zod) and `IStore` interface.
    *   Defines `AtomicUpdateInput` (OCC pattern).
2.  **Probe:** `probes/fs_atomic.ts`
    *   Verifies `fs.rename` atomicity and `fsync` behavior on this OS.
    *   Captures `fixtures/store/capabilities.json`.
3.  **Mock:** `src/lib/mocks/store.mock.ts`
    *   In-memory Map that mimics the file.
    *   Scenarios: `success`, `stale_revision` (throw error), `corrupt_file`.
4.  **Test:** `tests/contract/store.test.ts`
    *   Tests `update()` throws if revisions don't match.
    *   Tests persistence of data.
5.  **Real:** `src/lib/adapters/store.adapter.ts`
    *   Implements the "Write-to-Temp -> Fsync -> Rename" pattern.

### Step 1.2: The Lock Manager Seam (Safety)
**Goal:** Prevent race conditions between agents.
1.  **Contract:** `contracts/locker.contract.ts`
    *   Methods: `requestLocks(paths[], ownerId, ttl)`, `releaseLocks()`, `renewLease()`.
2.  **Probe:** `probes/lock_contention.ts`
    *   Spawns two child processes trying to lock the same resource.
    *   Captures `fixtures/locker/contention.json` (timing data).
3.  **Mock:** `src/lib/mocks/locker.mock.ts`
    *   Simulates success/fail based on requested paths.
4.  **Test:** `tests/contract/locker.test.ts`
    *   Verifies **Canonical Sorting** (locking [B, A] works same as [A, B]).
    *   Verifies TTL expiration.
5.  **Real:** `src/lib/adapters/locker.adapter.ts`
    *   Uses the `IStore` to persist locks in the JSON file.

---

## Phase 2: The Collaboration Features

### Step 2.1: The Task Registry
**Goal:** Manage the "ToDo" list.
1.  **Contract:** `contracts/tasks.contract.ts` (Task Schema).
2.  **Tools:** Implement `create_task`, `update_task` MCP tools.
3.  **Logic:** Updates the Store using `atomicUpdate`.

### Step 2.2: The Message Bridge & Long Polling
**Goal:** Real-time-ish communication.
1.  **Contract:** `contracts/messages.contract.ts`.
2.  **Tool:** `wait_for_update(sinceRevision)`.
    *   **Implementation:** An `EventEmitter` that emits on Store updates. The tool returns a Promise that resolves on emit or timeout.

---

## Phase 3: The Integration
1.  **Server:** `src/index.ts`
    *   Initialize `StoreAdapter`.
    *   Initialize `LockerAdapter`.
    *   Register MCP Tools.
    *   Start STDIO transport.

## Phase 4: The Meta-Tools (Self-Replication)
1.  **Tool:** `scaffold_seam`
    *   Automates the folder creation for future features.
2.  **Tool:** `run_probe`
    *   Runs the probes and updates fixtures.

---

## Phase 5: Mission Control "Cockpit" (TUI V2)
**Goal:** A dual-pane, chat-centric dashboard for real-time agent coordination.

### Step 5.1: Seams & Contracts
1.  **Contract:** `contracts/tui.contract.ts`
    *   Defines `TuiViewModel` (State), `TuiChatMessage`, `TuiCommand`.
    *   Defines `TuiConfig` (Pane roles, broadcast headers).
2.  **Probe:** `probes/tui/chat_simulation.ts`
    *   Generates `fixtures/tui/chat_simulation.json`.
    *   Simulates high-velocity chat, broadcast states, and health degradation.

### Step 5.2: The View Model (State Logic)
1.  **Logic:** `src/tui/logic/view_model.ts`
    *   **Pure Function:** `deriveViewModel(store, history) -> TuiViewModel`.
    *   **Broadcast Rule:** Broadcast messages appear in **both** panes.
    *   **Wait Rule:** "Broadcast Waiting" implies the **follower** is waiting for the leader.
2.  **Test:** `tests/unit/view_model.test.ts`
    *   Verifies transformation logic against fixtures.

### Step 5.3: The Adapter & UI
1.  **Adapter:** `src/tui/adapters/tui.adapter.ts`
    *   Maps TUI actions to MCP tool calls (`send_message`, `set_target`).
    *   Maps Server Health to TUI Health Seams (incorporating Telemetry).
2.  **UI:** `src/tui/ui/cockpit.ts` & `src/tui/index.ts`
    *   **Layout:** Split-screen (Left/Right) + Input Bar + Health Header + Status Bar.
    *   **Tech:** `blessed` (rendering) + `blessed-contrib` (widgets).