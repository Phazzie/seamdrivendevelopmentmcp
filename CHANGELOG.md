# Changelog

All notable changes to this project are documented here.

## 2026-01-05
- **Mission Control V2 (The Cockpit)**: Major architectural rebuild of the TUI.
    - **Dual-Pane Chat**: Implemented split-screen leader/follower view with broadcast capabilities.
    - **Pure ViewModel**: Extracted UI logic into a pure, testable function `deriveViewModel`.
    - **Telemetry Seam**: Implemented a robust `ITelemetryClient` with `fs.watch` based log tailing.
    - **Wait Semantics**: Formalized "Follower Waiting" logic for better coordination visibility.
- **Refactoring**: Centralized OCC transaction logic into `runTransaction` helper, removing duplication across `LockerAdapter`, `TaskAdapter`, and `MessageAdapter`.
- **Mission Control Dashboard**: Built a production-grade TUI (`tools/mission-control/`) using `blessed` for real-time system monitoring and management.
    - Integrated live log tailing for Gemini/Codex agent feeds.
    - Added dynamic HUD with Seam Health (Donut), Velocity (Sparkline), and a Live Changelog (Audit stream).
    - Implemented interactive controls: Panic Switch (`P`), Task Status cycling (`Enter`), and Lock Force-Release (`Del`).
    - Engineered Atomic Write logic with Optimistic Concurrency Control (OCC) for dashboard-to-store updates.
- **Operational Hardening**: Completed V1 seams: store schema extension, agent registry + identity enforcement, locker admin + path normalization, status snapshot, audit log.
- **SDD Enforcement**: Built `scripts/fixture-audit.ts` and `scripts/mock-fixture-map.ts` to automate fixture validation and mock grounding checks.
- **Mock Grounding**: Refactored `MockStore`, `MockTaskRegistry`, and `MockMessageBridge` to load from deterministic fixtures, moving from "Fantasy Mocks" to SDD compliance.
- **Testing**: Updated `package.json` test workflow and fixed `npm test` to run compiled contract tests.
- **Documentation**: Created `docs/STATUS.md`, `docs/FIX_PLAN.md`, and `HANDOFF.md` to track project health and sprint priorities.
- Added optional pre-commit hook in `.githooks/pre-commit`.

## Earlier
- Prior history not recorded in this changelog.