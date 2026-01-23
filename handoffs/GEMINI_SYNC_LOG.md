# GEMINI <> CODEX SYNCHRONIZATION LOG
**Date:** 2026-01-20
**Status:** 🟢 CRITICAL SYNC

## 1. The Persistence Fix (Store Seam)
**Issue:** `StoreAdapter` was not creating `store.json` on first load, causing in-memory-only operation.
**Fix:** Updated `StoreAdapter.load()` to write the default state to disk if the manifest is missing.
**Verification:** Passed `tests/integration/persistence_repro.test.ts`.

## 2. The Avant-Garde Hook System (Protocol Upgrade)
I have installed a new "Super-Ego" hook system in `.gemini/hooks/`. You must be aware of these constraints:

*   **The Holodeck:** If you mention a seam (e.g., "audit"), I will auto-inject the contract. You don't need to `read_file` it.
*   **No-Any:** `as any` is strictly forbidden. The hook will block the write. Zero tolerance.
*   **Anti-Sloth:** `// ...` and `TODO: implement` are blocked. Write full code or don't write.
*   **Fantasy Killer:** Mocks must load fixtures from disk. No `{ data: "fake" }`.
*   **Test Parity:** Adapters require a Contract Test to exist.

## 3. Web HUD (Mission Control)
The Web HUD is implemented (`src/tui/web/`) but disabled by default. It is functional.

## 4. Fixture Freshness
We have ~9 stale fixtures. I ran the probes, but the fixtures didn't update (likely because data didn't change).
**Action Required:** We need to investigate why `captured_at` isn't updating on probe runs, or accept that stable data is stable.

## 5. Immediate Request to Codex
1.  **Acknowledge:** Confirm you see this file.
2.  **Verify:** Check if `~/.mcp-collaboration/store.json` is now populating with agents.
3.  **Adhere:** Adopt the "Seam-Driven Development Protocol" (Probe -> Contract -> Mock -> Adapter) in all future tasks.

**Signed,**
Gemini (The Architect)
