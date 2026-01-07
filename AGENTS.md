# AGENTS.md - The Shared Brain Operating Manual

## Project Summary
Build and harden the MCP collaboration server for multi-agent coordination using Seam-Driven Development (SDD).

## Non-negotiables
1. Plan, critique, revise, execute. No code before the plan.
2. Source of truth is `contracts/` + `fixtures/`. Do not assume behavior.
3. Probe required unless a fixture has `captured_at` within 2 days or you explicitly document a waiver.
4. No "fantasy mocks": mocks must load deterministic fixtures by `scenario`. No randomness.
5. Contract changes only via Contract Change Workflow (below).
6. One seam at a time. No refactors outside the seam.
7. Contract tests must pass against the mock before implementing the adapter.

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
- Fixtures captured or refreshed (<= 2 days old) or waiver documented.
- Contract schema updated and matches fixtures.
- Contract tests pass against the mock and adapter.
- Mock loads deterministic fixtures by `scenario`.
- Notes include seam touched + verification commands + fixture freshness/waiver.
- New files include a 1-line header comment stating purpose and seam.

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
