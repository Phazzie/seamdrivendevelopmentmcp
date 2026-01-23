<!-- Purpose: AGENTS.md compliance checklist (process seam) -->
# AGENTS.md Compliance Checklist

## Non-negotiables
- [ ] Plan, critique, revise, execute. No code before the plan.
- [ ] Use `contracts/` + `fixtures/` as the source of truth.
- [ ] Run probes unless fixture `captured_at` <= 7 days or a waiver is documented.
- [ ] No fantasy mocks; mocks load deterministic fixtures by scenario.
- [ ] Contract changes only via the Contract Change Workflow.
- [ ] One seam at a time; no refactors outside the seam.
- [ ] Contract tests pass against the mock before implementing the adapter.

## SDD Workflow
- [ ] Define contract: `contracts/<seam>.contract.ts` (schema + types + failure modes).
- [ ] Probe + capture: `probes/<seam>.probe.ts` -> `fixtures/<seam>/...`.
- [ ] Mock + test: `src/lib/mocks/<seam>.mock.ts` + `tests/contract/<seam>.test.ts`.
- [ ] Implement + verify: `src/lib/adapters/<seam>.adapter.ts` with same contract test.

## Contract Change Workflow
- [ ] Update probe(s) to capture new behavior.
- [ ] Re-run probe(s) to refresh fixture(s).
- [ ] Update contract schema/types to match fixtures.
- [ ] Update contract tests to assert the new contract.
- [ ] Update mocks/adapters to satisfy the tests.

## Definition of Done (per seam)
- [ ] Fixtures captured/refreshed (<= 7 days) or waiver documented.
- [ ] Contract schema updated and matches fixtures.
- [ ] Contract tests pass against mock and adapter.
- [ ] Mock loads deterministic fixtures by scenario.
- [ ] Notes include seam touched + verification commands + fixture freshness/waiver.
- [ ] New files include a 1-line header comment (purpose + seam).

## Scenario Conventions
- [ ] Scenario names are lowercase snake case (e.g., `locked_file`).
- [ ] Every mock path maps to a fixture or returns a contract-compliant error.

## Anti-patterns (avoid)
- [ ] "Trust me" mocks: returning data without a fixture.
- [ ] Silent contract changes to fix compilation or tests.
- [ ] Implementing adapters before mock contract tests pass.
- [ ] Skipping probes when fixtures are missing or stale.

## Canonical Commands
- [ ] `npx tsc -p tsconfig.json`
- [ ] `node --test dist/tests/contract/<seam>.test.js`
- [ ] `npx tsc probes/<seam>.probe.ts --outDir dist/probes --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck`
- [ ] `node dist/probes/**/<seam>.probe.js`

## Stop / Ask Triggers
- [ ] Product behavior is ambiguous or conflicting.
- [ ] Tests fail and the fix is unclear.
- [ ] A contract change is needed but not explicitly approved.
- [ ] A probe or fixture refresh cannot be run.

## Tooling
- [ ] Use `scripts/sdd-check.ts` before and after a seam.
- [ ] Use `scripts/sdd-scaffold.ts` to create seam scaffolding.

## Project References
- [ ] Agent collaboration log: `docs/agent-collab.md`.
- [ ] Gemini reference doc: `/Users/hbpheonix/Projects/seam-driven-development/docs/gemini-seam-driven-development-prompt.md`.
- [ ] Root truth: `contracts/`, `fixtures/`, `probes/`, `tests/`.
- [ ] Source layout: `src/lib/adapters/`, `src/lib/mocks/`, `src/server/`.

## Error Envelope
- [ ] All errors conform to `AppError` (`code`, `message`, `details`).
