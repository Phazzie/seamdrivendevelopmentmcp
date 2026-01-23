<!-- Purpose: Agent collaboration log (seam: docs). -->
# Agent Collaboration Log

## 2026-01-22
- Seam: store
  - Fixed persistence bug where `load()` didn't initialize `store.json` on disk.
  - Verified with integration tests.
- Seam: agents
  - Implemented identity persistence in `AgentAdapter`. `register()` now reuses existing IDs by name.
  - Verified with integration tests.
- Seam: dev_infra (Probes)
  - Patched probes to use `process.cwd()` instead of `__dirname` for fixture path resolution.
  - Updated probes to refresh `captured_at` for all seam files (`default.json`, etc.).
  - Renamed `probes/fs_template_write.probe.ts` to `probes/scaffolder.probe.ts`.
  - All 59 fixtures now PASS the hygiene audit.
- Hooks
  - Synced and verified the Avant-Garde Hook System (Holodeck, No-Any, Anti-Sloth, etc.).
  - Established `handoffs/GEMINI_SYNC_LOG.md` for cross-session alignment.
- Seam: docs
  - Consolidated doc sprawl. `docs/SDD_MASTER_GUIDE.md` (V1.2.0) is now the single source of truth for SDD and Laws.
  - Updated `AGENTS.md` (V1.2.0) as the operational SOP.
  - Archived philosophical content to `docs/archive/THE_SHAOLIN_CHRONICLES.md`.
