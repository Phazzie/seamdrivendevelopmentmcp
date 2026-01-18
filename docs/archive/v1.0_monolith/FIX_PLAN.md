# SDD Fix Plan & ROI Ranking

This document outlines the top 10 recommended fixes for the MCP Collaboration Server, ranked by Return on Investment (ROI).

## The Ranking Logic
*   **ROI = Value / Effort**
*   **Value:** Impact on stability, compliance (SDD), or safety.
*   **Effort:** Time/complexity to implement.

## 1. Top 5 "Quick Wins" (Highest ROI)

### 🥇 Rank 1: Ground `tasks.mock.ts`
*   **Why:** Currently a "Fantasy Mock" (violates SDD). Without this, we can't trust offline tests for the Task Registry.
*   **Effort:** Very Low (Create `fixtures/tasks/sample.json` + 10 lines of code change).
*   **Action:** Create fixture, refactor `MockTaskRegistry` to load it.

### 🥈 Rank 2: Ground `messages.mock.ts`
*   **Why:** Currently a "Fantasy Mock". Required for offline testing of the Message Bridge.
*   **Effort:** Very Low.
*   **Action:** Create `fixtures/messages/sample.json`, refactor `MockMessageAdapter`.

### 🥉 Rank 3: Fix `npm test` script
*   **Why:** Currently `npm test` errors out. This prevents any automated confidence checks.
*   **Effort:** Tiny (Update `package.json` to run `ts-node tests/**/*.test.ts`).
*   **Action:** Update `package.json`.

### 4. Create `fixtures/messages/sample.json`
*   **Why:** Prerequisite for Rank 2.
*   **Effort:** Tiny (JSON file creation).
*   **Action:** Copy structure from contract.

### 5. Create `fixtures/tasks/sample.json`
*   **Why:** Prerequisite for Rank 1.
*   **Effort:** Tiny.
*   **Action:** Copy structure from contract.

---

## 2. Top 5 "Strategic Improvements" (High Value, Medium Effort)

### 6. Integration Probe (`probes/integration.ts`)
*   **Why:** The "Holy Grail" of SDD. It would spawn the server and run real CLI tools against it to capture *actual* output into fixtures, replacing manual JSON creation.
*   **Effort:** High (Async process spawning, STDIO parsing).
*   **Value:** Critical for long-term drift prevention.

### 7. Path Canonicalization in Locker
*   **Why:** On macOS, locking `File.txt` should also lock `file.txt`. Currently, the logic exists but relies on a fixture config that defaults to "none".
*   **Effort:** Medium (Need to reliably detect FS case-sensitivity or enforce `realpath`).
*   **Value:** Prevents subtle race conditions.

### 8. Message Long Polling
*   **Why:** The `wait_for_update` tool is defined but might be flaky if `messages.adapter.ts` doesn't handle listener cleanup perfectly.
*   **Effort:** Medium.
*   **Value:** Enables "Real-time" agent collaboration without spamming poll requests.

### 9. Agent Identity Persistence
*   **Why:** Currently `agents.adapter.ts` is likely ephemeral or rudimentary. We need `ownerId` to be persistent so locks survive restarts.
*   **Effort:** Medium.
*   **Value:** Essential for multi-session use.

### 10. Automated Backups (`.bak` files)
*   **Why:** If the atomic write crashes mid-rename (rare but possible), we could lose the DB.
*   **Effort:** Low-Medium.
*   **Value:** Data Safety.

---

## Summary
The clear path forward is to **Ground the Mocks** (Ranks 1 & 2). This turns the project status from **AMBER** to **GREEN**.
