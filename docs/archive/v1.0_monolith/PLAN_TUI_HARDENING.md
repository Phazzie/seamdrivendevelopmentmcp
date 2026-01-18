# PLAN_TUI_HARDENING.md - Granular Execution Plan

This plan outlines the hardening of the Mission Control TUI, focusing on Performance, Visibility, and Safety using Seam-Driven Development.

## Phase 1: The Event-Driven Core (Performance)
Goal: Eliminate 1s polling in favor of reactive long-polling to reduce CPU/IO overhead.

### Step 1.1: Contract Extension
- **File:** `contracts/tui.contract.ts`
- **Action:** Add `waitForUpdate(sinceRevision: number): Promise<{ revision: number }>` to `ITuiDataClient`.
- **Why:** To allow the UI to sleep until the server state actually changes.
- **Caution:** Ensure the revision number type matches the `Store` seam exactly.

### Step 1.2: Reality Probe
- **File:** `probes/tui/long_poll.probe.ts`
- **Action:** Create a script that calls `wait_for_update` and measures how long the connection stays open before timing out.
- **Why:** To verify that our transport layer (STDIO) doesn't kill long-running requests.
- **Caution:** Test with a 30s timeout to ensure no "Zombie" processes are left behind.

### Step 1.3: Mock Implementation
- **File:** `src/lib/mocks/tui.mock.ts`
- **Action:** Implement `waitForUpdate` using a `setTimeout` that resolves after 2 seconds or when a mock message is sent.
- **Why:** To test the UI's reaction to "Wake up" events without a real server.
- **Caution:** Mock must support cancellation if the user quits the TUI during a wait.

### Step 1.4: Adapter Wiring
- **File:** `src/tui/adapters/tui.adapter.ts`
- **Action:** Map `waitForUpdate` to the existing `messageBridge.waitForUpdate`.
- **Why:** The Message seam already has the logic to watch the Store for revision bumps.
- **Caution:** Errors in the bridge (like a store disconnect) must be caught and returned as an error state, not a crash.

### Step 1.5: UI Logic Refactor
- **File:** `src/tui/ui/cockpit.ts`
- **Action:** Delete `setInterval(refresh, 1000)`. Implement an `async function runLoop()` that calls `refresh()` -> `waitForUpdate(lastRev)` -> `runLoop()`.
- **Why:** This makes the UI frame-rate dynamic based on activity.
- **Caution:** **CRITICAL:** Implement a `isRefreshing` mutex. If `waitForUpdate` resolves while a manual `refresh` (from an input submit) is running, we must not draw to the screen twice or we will corrupt the terminal buffer.

---

## Phase 2: Task Summary Pane (Visibility)
Goal: Give the user an at-a-glance view of the "Top 5" active tasks.

### Step 2.1: Contract Definition
- **File:** `contracts/tui.contract.ts`
- **Action:** Define `TuiTaskSummarySchema` (Array of 5 tasks with Title, Assignee, and "Blocked" status).
- **Why:** To keep the UI data payload small and focused.
- **Caution:** Reuse the `Task` type from `tasks.contract.ts` to avoid duplication.

### Step 2.2: Capture Fixture
- **File:** `probes/tui/task_summary.probe.ts`
- **Action:** Populate a test store with 10 tasks, run the filtering logic, and capture the JSON.
- **Why:** To provide a stable "Golden Master" for UI layout testing.
- **Caution:** Include at least one "Blocked" task to verify color-coding.

### Step 2.3: Mock Update
- **File:** `src/lib/mocks/tui.mock.ts`
- **Action:** Implement `getTaskSummary()` to return the fixture data.
- **Why:** To allow Step 2.5 (UI) to be developed without the real task engine.
- **Caution:** Ensure the mock handles the "No Tasks" case (empty array).

### Step 2.4: Real Adapter Integration
- **File:** `src/tui/adapters/tui.adapter.ts`
- **Action:** Inject the `TaskAdapter`. Implement `getTaskSummary()` by calling `tasks.list()` and taking the top 5 `in_progress` or `todo` items.
- **Why:** This is the real-world connection.
- **Caution:** Filtering logic must be efficient. Sort by "last modified" so active tasks stay at the top.

### Step 2.5: UI Layout Change
- **File:** `src/tui/ui/cockpit.ts`
- **Action:** Create a new `blessed.box` called `taskPane`. Place it at the top or side. Add a toggle key (e.g., `F2`) to show/hide it.
- **Why:** Visibility of the work plan.
- **Caution:** `neo-blessed` layouts are absolute. Resizing the Chat panes to make room for the Task pane requires careful math or it will look broken on small terminals.

---

## Phase 3: Human Approval Gate (Safety)
Goal: Enforce human sign-off for agent actions (like file locking).

### Step 3.1: Contract Actions
- **File:** `contracts/tui.contract.ts`
- **Action:** Add `getPendingApprovals()` and `submitDecision(gateId, choice)`.
- **Why:** To allow the UI to act as a remote control for the server's `ReviewGate`.
- **Caution:** Decisions must be limited to specific enums (APPROVE/REJECT).

### Step 3.2: Real Security Enforcement
- **File:** `src/lib/adapters/locker.adapter.ts`
- **Action:** In the `acquire()` method, add a check: if `global_lock_policy === 'strict'`, check if a `ReviewGate` exists for this agent. If not, reject the lock request with `LOCKED_PENDING_APPROVAL`.
- **Why:** To turn "Advisory" safety into "Real" safety.
- **Caution:** Avoid deadlocks where an agent is waiting for a lock but the TUI is waiting for the agent to send a message.

### Step 3.3: Adapter Mapping
- **File:** `src/tui/adapters/tui.adapter.ts`
- **Action:** Connect to the `ReviewGateAdapter`.
- **Why:** To pull pending requests into the UI state.
- **Caution:** Handle the case where a gate is deleted or resolved by another agent (Gavel mode).

### Step 3.4: The "Emergency" Notification Bar
- **File:** `src/tui/ui/cockpit.ts`
- **Action:** Create a `notificationBar` (top fixed, bg: red). If `pendingApprovals > 0`, show `"APPROVAL NEEDED: [Y] Approve [N] Reject"`.
- **Why:** High visibility for safety events without using intrusive popups.
- **Caution:** Listen for Global `Y` and `N` keys ONLY when the notification bar is active to avoid mis-clicks during chat.
