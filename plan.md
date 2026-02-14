# Production Execution Plan (Autonomous)

## Mission
Deliver a production-complete MCP collaboration server that can orchestrate headless `codex` CLI and `gemini` CLI workers, with zero known tech debt on exposed runtime paths.

## Non-Negotiables
- Preserve existing passing behavior unless correctness/security requires change.
- No `NYI`, no dead exposed runtime adapters/providers.
- Security-first for path jailing, process launch safety, and command templating.
- Full gates green before release:
  - `npx tsc -p tsconfig.json`
  - `npm run verify`
  - `npm test`

## Execution Phases

### Phase 0: Baseline + Existing Refactors
Status: `completed`

Work:
- Finalize centralized runtime guards already introduced:
  - `agentId` context enforcement.
  - panic write-guarding for mutating tools.
  - duplicate tool registration detection.
- Keep regression tests for these guardrails green.

Evidence:
- Unit tests for tool executor/registry guardrails.
- Full gate run outputs.

### Phase 1: Pre-Orchestrator Debt Burn-Down
Status: `in_progress`

Work:
- Normalize provider schema/handler parity for `agentId`.
- Ensure panic semantics are explicit and consistent in exposed write paths.
- Add/refresh tests for failure paths discovered during Phase 0.

Evidence:
- Updated contract/integration tests.
- No mandate violations.

### Phase 2: Worker Orchestrator Seam (SDD Loop)
Status: `completed`

SDD order:
1. Contract
2. Probe
3. Mock
4. Test
5. Adapter
6. Provider wiring

Scope:
- Add `worker_orchestrator` seam with:
  - worker registration/lifecycle (`spawn`, `list`, `stop`),
  - task dispatch to headless CLIs,
  - run history and traceability,
  - safe process execution via helper (no shell string execution in adapters).
- Implement dispatch strategies:
  - `single_worker`
  - `codex_writes_gemini_reviews`
  - `gemini_writes_codex_reviews`
  - `parallel_dual_write_review`
  - `security_redteam_pass`

Safety requirements:
- Strict command templates by worker model.
- Timeouts, kill-on-hang, bounded output capture.
- Environment allowlist and jailed working directory checks.

Evidence:
- New contract tests for mock + adapter conformance.
- Integration test proving strategy execution paths.
- Probe output proving runtime capability reporting.

### Phase 3: Collaboration Patterns + Reliability
Status: `pending`

Work:
- Add deterministic orchestration playbook support:
  - writer/reviewer handoff,
  - reviewer-first planning then writing,
  - parallel solution generation and adjudication.
- Add resilience:
  - worker failure handling,
  - partial strategy fallback behavior,
  - auditable run summaries.

Evidence:
- Integration tests for multi-step strategies and recovery paths.

### Phase 4: Production Hardening + Release
Status: `pending`

Work:
- Rerun full release checklist and capture evidence artifacts.
- Confirm no exposed runtime tech debt remains.
- Publish final status + go/no-go recommendation.

Evidence:
- Gate outputs attached in `evidence/release/<date>/`.
- Explicit risk register with residual risks (if any).

## Autonomous Continuation Rule
If no user response is available, continue executing phases in order:
1. Complete current phase.
2. Run gates.
3. Record evidence.
4. Move to next phase until blocked by an external dependency (credentials, missing binaries, or environment permissions).

## Current Focus
- Complete Phase 1 schema/handler consistency tightening, then move into Phase 3 reliability enhancements.
