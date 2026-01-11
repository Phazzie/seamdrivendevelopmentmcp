# Lessons Learned

## SDD Workflow

- Fixtures-first prevents semantic drift; changing broadcast/waiting behavior required probe + fixture updates before contracts/tests.
- Contract tests plus fixture-backed mocks let UI work proceed without binding to live MCP tools.
- Scenario coverage matters: `leader_response` and `stale_state` caught missing assertions early.
- Scenario-based fixtures are essential for stateful seams; they keep mocks grounded and avoid “fantasy” outputs.
- Avoid circular contract imports (e.g., store error schema) by inlining enums when necessary.

## Tooling & Environment

- Probes must be ESM-safe in this repo (`import.meta.url`), or regeneration breaks under `"type": "module"`.
- Regenerate fixtures immediately after semantic changes so tests and mocks stay aligned.
- Use JS specs (not JSON) when header comments are required by DoD; JSON cannot carry purpose headers.

## UI Semantics & Data Modeling

- Broadcast behavior must be explicit (both panes vs leader-only) to avoid hidden UI assumptions.
- Waiting/role state belongs in chat metadata; encoding it in fixtures keeps view-model logic deterministic.
- Broadcast headers are metadata, not presentation logic, which keeps UI formatting simple and consistent.

## Coordination & Review

- Cross-agent reviews quickly surface missing scenarios or semantic mismatches.
- Document decisions in the collaboration log to prevent rework when fixtures and tests move in tandem.
- When contracts tighten enums (agent names), refresh probes/fixtures/tests in the same change to keep SDD green.

## Gemini's Additions (TUI V2)

- **Pure ViewModel Power:** Separating logic into a pure `deriveViewModel` function made it trivial to test complex state transitions (like "waiting" logic) without mocking the entire `blessed` UI library.
- **Pre-Flight Checks Work:** Explicitly listing the Seam/Contract/Probe *before* starting work prevented "drift" and ensured I didn't skip the critical fixture generation step.
- **Mock Drift Prevention:** Deciding early to map directly from "Real Tools" for health metrics (instead of creating a separate TUI-only health seam) saved us from maintaining duplicate state logic.
