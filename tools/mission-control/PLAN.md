# Mission Control: Production Readiness Plan

## Implementation Checklist
- [x] **Phase 1: Real-Time Data**
    - [x] 1.1 Live Log Streaming (Gemini/Codex/Server)
    - [x] 1.2 "True" Seam Health Metric (Store/Lock/Audit)
    - [x] 1.3 Velocity Tracking (Sparkline)
- [x] **Phase 2: Command & Control**
    - [x] 2.1 The Panic Switch (Bind `P`)
    - [x] 2.2 Lock Administration (Interactive Table)
    - [x] 2.3 Task Triage (Cycle Status)
- [ ] **Phase 3: Robustness**
    - [x] 3.1 Configuration Loader (CLI Args)
    - [x] 3.2 Atomic Write Safety
    - [x] 3.3 Offline/Reconnection States
- [x] **Phase 4: UX**
    - [x] 4.1 Help Modal (Bind `?`)
    - [x] 4.2 Focus Navigation (Bind `Tab`)

## Phase 1: Real-Time Data Integrity (The "Eyes")
**Goal:** Replace "fantasy metrics" and empty logs with real system telemetry.

### 1.1 Live Log Streaming
*   **Problem:** Terminal windows are currently placeholders.
*   **Solution:** Implement `LogStreamer` class.
    *   **Gemini:** Tail `~/.gemini/logs/current.log` (or equivalent).
    *   **Codex:** Tail `~/.codex/logs/current.log`.
    *   **Server:** Tail `~/.mcp-collaboration/server.log`.
*   **Tech:** Use `tail` (child_process) or a node-native `fs.watch` buffer to pipe lines into the `contrib.log` widgets.

### 1.2 "True" Seam Health Metric
*   **Problem:** Health gauge is hardcoded to 87%.
*   **Solution:** specific health checks.
    *   **Store Health:** 100% - (Number of "STALE_REVISION" errors in last 1hr).
    *   **Lock Health:** 100% - (Lock contention % + Locks held > 1hr).
    *   **Audit Health:** Check for `errorCode` frequency in `audit` array.
    *   **Action:** Update the Donut gauge with these calculated values.

### 1.3 Velocity Tracking (Sparkline)
*   **Problem:** Unused/Mocked space.
*   **Solution:** Visualize "Operations per Minute".
    *   Count distinct `revision` increments in `store.json` over a rolling 60s window.
    *   Display as a sparkline to show burst activity.

---

## Phase 2: Command & Control (The "Hands")
**Goal:** Allow the user to intervene, not just watch.

### 2.1 The Panic Switch
*   **Feature:** Bind `P` key.
*   **Action:** 
    1.  Read `store.json`.
    2.  Toggle `panic_mode`.
    3.  Atomic Write back to disk.
*   **UI:** Show a confirmation modal before triggering.

### 2.2 Lock Administration
*   **Feature:** Interactive Lock Table.
*   **Action:** 
    1.  Allow arrow key navigation in the Lock/Task table.
    2.  Bind `Del` or `Backspace`.
    3.  Trigger `force_release_locks` for the selected item.

### 2.3 Task Triage
*   **Feature:** Quick Status Updates.
*   **Action:**
    1.  Select a task.
    2.  Press `Enter` to cycle status (Todo -> In Progress -> Review -> Done).

---

## Phase 3: Robustness & Configuration (The "Armor")
**Goal:** Ensure it works on any machine and doesn't crash.

### 3.1 Configuration Loader
*   **Problem:** Hardcoded paths (`~/.mcp-collaboration/...`).
*   **Solution:** `config.js` or `rc` file support.
    *   Look for `~/.mission-controlrc`.
    *   Support CLI args: `npm start -- --store ./my-store.json --logs ./my-logs/`.

### 3.2 Atomic Write Safety
*   **Problem:** The TUI writing to `store.json` might race with the Server.
*   **Solution:**
    *   Implement the same `AtomicUpdate` pattern as the Server (Read -> Modify -> Atomic Rename).
    *   Respect the `revision` number (OCC).

### 3.3 Offline/Reconnection States
*   **Problem:** If the server stops, the TUI might freeze or show stale data.
*   **Solution:**
    *   Visual "Disconnected" indicator if `store.json` hasn't changed in X minutes (or `uptime` isn't updating).
    *   Graceful error handling if file access is denied.

---

## Roadmap
1.  **Next Sprint:** Implement Phase 1.1 (Logs) and 2.1 (Panic Switch).
2.  **Follow-up:** Implement Phase 1.2 (Metrics) and 3.1 (Config).
