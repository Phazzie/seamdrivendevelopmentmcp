# AGENTS.md - The Shared Brain Operating Manual

## System Context & Constraints (from Gemini Memory)
- **OS:** macOS Monterey (darwin).
- **Package Management:** Run `npm install` with `--cache .npm-cache` to avoid root permission errors.
- **Preference:** Strict SDD for core infra; "YOLO mode" allowed for internal prototypes.

## Project Summary
Build and harden the MCP collaboration server for multi-agent coordination using Seam-Driven Development (SDD).

## Non-negotiables
1. Plan, critique, revise, execute. No code before the plan.
2. Source of truth is `contracts/` + `fixtures/`. Do not assume behavior.
3. Probe required unless a fixture has `captured_at` within 7 days or you explicitly document a waiver.
4. No "fantasy mocks": mocks must load deterministic fixtures by `scenario`. No randomness.
5. Contract changes only via Contract Change Workflow (below).
6. One seam at a time. No refactors outside the seam.
7. Contract tests must pass against the mock before implementing the adapter.

## Planning Discipline
- For low-risk or trivial tasks, keep plan/critique/revise to 1-2 bullets each before execution.
- If a step feels redundant, keep it brief rather than skipping it.

## SDD Workflow
1. Define & contract: create `contracts/<seam>.contract.ts` (schema + types) and include failure modes.
2. Probe & capture: run `probes/<seam>.probe.ts` to generate `fixtures/<seam>/...`.
3. Mock & test: create `src/lib/mocks/<seam>.mock.ts` and `tests/contract/<seam>.test.ts` (mock must pass).
4. Implement & verify: create `src/lib/adapters/<seam>.adapter.ts` and run the same contract test.

## Contract Change Workflow
1. Update probe(s) to capture new behavior.
2. Re-run probe(s) to refresh fixture(s).
3. Update contract schema/types to match fixtures.
4. Update contract tests to assert the new contract.
5. Update mocks/adapters to satisfy the tests.

## Definition of Done (per Seam)
- Fixtures captured or refreshed (<= 7 days old) or waiver documented; if a fixture includes `captured_at`, use ISO-8601 UTC (e.g., `2025-02-07T12:34:56Z`).
- Contract schema updated and matches fixtures.
- Contract tests pass against the mock and adapter.
- Mock loads deterministic fixtures by `scenario`.
- Notes include seam touched + verification commands + fixture freshness/waiver in `docs/agent-collab.md`.
- New files include a 1-line header comment stating purpose and seam (e.g., `// Purpose: <summary> (seam: <seam>)`).

## Scenario Conventions
- Scenario names are lowercase snake case (e.g., `locked_file`, `not_found`).
- Every mock path must map to a fixture or return a contract-compliant error.

## Anti-Patterns (avoid)
- "Trust me" mocks: returning data without a fixture.
- Silent contract changes to fix compilation or tests.
- Implementing adapters before the mock contract test passes.
- Skipping probes when fixtures are missing or stale.

## Canonical Commands
- Compile code/tests: `npx tsc -p tsconfig.json`
- Run contract test: `node --test dist/tests/contract/<seam>.test.js`
- Compile probe: `npx tsc probes/<seam>.probe.ts --outDir dist/probes --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck`
- Run probe: `node dist/probes/**/<seam>.probe.js`

## Stop / Ask Triggers
- Product behavior is ambiguous or conflicting.
- Tests fail and the fix is unclear.
- A contract change is needed but not explicitly approved.
- A probe or fixture refresh cannot be run.

## Tooling
- Use `scripts/sdd-check.ts` before and after a seam to enforce SDD gates and fixture freshness.
- Use `scripts/sdd-scaffold.ts` to create seam scaffolding when starting new work.

## Project References
- Working directory: `/Users/hbpheonix/mcp-collaboration-server`
- Agent collaboration log: `docs/agent-collab.md` (use for Codex/Gemini notes, questions, reviews).
- Gemini reference doc: `/Users/hbpheonix/Projects/seam-driven-development/docs/gemini-seam-driven-development-prompt.md`
- Root: `contracts/`, `fixtures/`, `probes/`, `tests/` (truth lives at the root).
- Src: `src/lib/adapters/`, `src/lib/mocks/`, `src/server/`.

## Error Envelope
All errors must conform to `AppError`:
- `code`: "LOCKED" | "STALE_REVISION" | "PANIC_MODE" | "VALIDATION_FAILED" | "INTERNAL_ERROR"
- `message`: Human readable string.
- `details`: JSON payload.

## Standard Operating Procedures (SOPs)

### 1. New Feature Implementation
1.  **Plan:** Create a plan in `PLAN.md` or similar.
2.  **Track:** Use `create_task` to track the high-level goal.
3.  **Decompose:** Use `decompose_plan` (CLI) or manual breakdown to create sub-tasks.
4.  **Assign:** Use `divvy_work` to distribute tasks if multiple agents are active.
5.  **Lock:** Use `request_file_locks` for the files you intend to edit.
6.  **Implement:** Follow SDD (Probe -> Contract -> Mock -> Adapter).
7.  **Verify:** Run tests (`npm test`).
8.  **Complete:** Use `update_task_status` to mark as done.

### 2. Resolving Conflicts
1.  **Detect:** If you cannot acquire a lock or agree on a plan.
2.  **Arbitrate:** Use `request_gavel` to pause operations and request human intervention.
3.  **Discuss:** Use `post_message` to explain the conflict.
4.  **Resume:** Wait for `release_gavel`.

### 3. Architectural Decisions
1.  **Propose:** If a decision affects schemas or core patterns, use `create_adr` (status: "proposed").
2.  **Review:** Ask the other agent/user to review.
3.  **Finalize:** Update ADR status to "accepted" before implementation.

## Available MCP Tools
- **Meta:** `run_probe`, `scaffold_seam`
- **Agents:** `register_agent`, `whoami`, `list_agents`, `get_status`, `list_audit`
- **Locks:** `request_file_locks`, `release_file_locks`, `renew_file_locks`, `list_locks`, `force_release_locks`
- **Tasks:** `create_task`, `update_task_status`, `list_tasks`
- **Dependencies:** `add_dependency`, `remove_dependency`, `get_dependencies`, `list_actionable_tasks`
- **Scheduler:** `divvy_work`
- **Knowledge:** `knowledge_add_node`, `knowledge_link_nodes`, `knowledge_query`
- **ADR:** `create_adr`, `list_adrs`
- **Events:** `publish_event`, `get_recent_events`, `subscribe_to_events`
- **Notifications:** `send_notification`, `list_notifications`
- **Auction:** `resolve_confidence_auction`
- **Mood:** `log_mood`, `list_moods`
- **Arbitration:** `get_gavel_state`, `request_gavel`, `grant_gavel`, `release_gavel`
- **Review:** `submit_plan`, `submit_critique`, `approve_plan`, `get_review_gate`, `list_review_gates`
- **Messages:** `post_message`, `list_messages`, `wait_for_update`
- **Panic:** `trigger_panic`, `resolve_panic`
