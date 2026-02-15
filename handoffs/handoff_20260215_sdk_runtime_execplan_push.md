# Handoff — 2026-02-15 SDK Runtime + ExecPlan Completion

## Current State
- Branch: `main`
- Latest commit on remote: `784bb82`
- Working tree status before this handoff commit: clean
- Server quality gates are green on latest implementation.

## What Shipped
1. Added ExecPlan workflow scaffolding:
- `AGENTS.md` now includes ExecPlan guidance.
- New `.agent/PLANS.md` with strict living-plan rules.
- `plan.md` upgraded to a maintained ExecPlan with progress/evidence logs.

2. Upgraded worker orchestration runtime surface:
- Runtime modes: `cli`, `openai_sdk`, `google_sdk`.
- Fallback policy: `on_error` or `never`.
- Runtime metadata persisted on run steps (`runtimeMode`, `runtimeModel`, optional `fallbackFrom`).

3. Added SDK runtime implementations:
- `src/lib/helpers/worker_runtime_openai_sdk.helper.ts`
- `src/lib/helpers/worker_runtime_google_sdk.helper.ts`
- Bootstrap/runtime wiring updated in `src/lib/helpers/server_bootstrap.ts`.

4. Updated provider + adapter behavior:
- `spawn_worker` accepts optional `runtimeMode`.
- `dispatch_task` accepts optional `runtimeMode` and `fallbackPolicy`.
- Adapter now performs deterministic runtime selection and CLI fallback when allowed.

5. Tests and probes:
- Added/updated orchestration tests for fallback semantics.
- Fixed probe regressions:
  - `probes/agent_claude.probe.ts` updated for current `register(name, selfName)` signature.
  - `probes/worker_capability.probe.ts` fixed for ESM (`new Worker(new URL(import.meta.url), ...)`).

## Validation Evidence
- `npx tsc -p tsconfig.json` ✅
- `npm run verify` ✅
- `npm test` ✅ (215 passed / 0 failed)
- `npm run probes` ✅ (all probes passed)

## Remaining Gaps (Priority Order)
1. Build true autonomous orchestrator loop (continuous plan/delegate/monitor/replan).
2. Add live SDK credentialed E2E dispatch validation in staging/CI.
3. Production hardening: rate limits, secret policy, runtime SLO/alerting.
4. Address existing dependency security findings reported by GitHub.

## Resume Instructions (Fast Start)
1. Pull `main`.
2. Ensure env keys if testing SDK runtimes:
- `OPENAI_API_KEY` or `MCP_OPENAI_API_KEY`
- `GEMINI_API_KEY` or `MCP_GOOGLE_API_KEY`
3. Run:
- `npm install --cache .npm-cache`
- `npm run verify`
- `npm test`
- `npm run probes`
4. Continue from `plan.md` (living ExecPlan), next milestone is autonomous orchestrator loop.

## Notes
- No known runtime-path placeholders remain in exposed worker orchestration paths.
- Existing CLI behavior preserved; SDK paths are additive and policy-driven.
