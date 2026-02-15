# Adopt SDK-Backed Orchestration Runtime With CLI Fallback

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository contains `.agent/PLANS.md`. This document must be maintained in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

After this change, the orchestration system will be able to run the same task strategies through either CLI execution or SDK execution, selected by policy, without breaking current behavior. A user will be able to register workers, dispatch tasks, and see completed run history while choosing a runtime mode (`cli`, `openai_sdk`, `google_sdk`) at the server level or per worker profile. This matters because SDK runtimes are more structured and reliable for long-running workflows, but CLI fallback keeps operations resilient when SDK credentials or APIs are unavailable.

The user-visible proof is simple: dispatch the same task twice using two runtime modes and confirm both runs complete, with run metadata explicitly showing which runtime handled each step.

## Progress

- [x] (2026-02-15 19:05Z) Added ExecPlan governance anchors: `AGENTS.md` now references `.agent/PLANS.md`, and `.agent/PLANS.md` now exists.
- [x] (2026-02-15 19:08Z) Replaced legacy phase-only `plan.md` with this full novice-safe ExecPlan for SDK migration.
- [x] (2026-02-15 05:10Z) Installed and locked SDK dependencies for OpenAI and Google runtime paths (`openai`, `@google/genai`).
- [x] (2026-02-15 05:13Z) Extended orchestration contracts/schema for runtime mode and fallback policy, including persisted run-step runtime metadata.
- [x] (2026-02-15 05:14Z) Implemented OpenAI SDK runtime helper with normalized result handling and model resolution.
- [x] (2026-02-15 05:15Z) Implemented Google SDK runtime helper with timeout guard and normalized result handling.
- [x] (2026-02-15 05:17Z) Added deterministic runtime selector + fallback behavior in `WorkerOrchestratorAdapter` and wired runtime map in server bootstrap/provider handlers.
- [x] (2026-02-15 05:19Z) Added runtime fallback contract tests and updated integration fakes to enforce interface parity.
- [x] (2026-02-15 05:21Z) Repaired two failing probes (`agent_claude`, `worker_capability`) and confirmed `npm run probes` passes.
- [x] (2026-02-15 05:22Z) Refreshed release evidence and validated all gates (`npx tsc -p tsconfig.json`, `npm run verify`, `npm test`, `npm run probes`).

## Surprises & Discoveries

- Observation: The orchestrator seam is already implemented and passing full gates with CLI-based worker execution.
  Evidence: Current branch has working `worker_orchestrator` contract, adapter, provider, and passing orchestrator tests.

- Observation: `@openai/codex` already exists in `package.json`, but orchestration runtime currently uses CLI process execution only.
  Evidence: `package.json` contains `@openai/codex`, while `src/lib/helpers/worker_runtime.helper.ts` constructs CLI command invocations.

- Observation: `npm run sdd:check` can fail because many historical fault fixtures are stale by age, independent of runtime correctness.
  Evidence: `scripts/fixture-audit.ts` enforces strict age limits by default; stale failures are mostly in older fault fixtures.

- Observation: Two probes failed after runtime work for reasons unrelated to SDK orchestration logic: an adapter API signature drift and an ESM worker-file assumption.
  Evidence: `agent_claude.probe.ts` called `register("Claude")` after adapter moved to `register(name, selfName)`, and `worker_capability.probe.ts` failed with `__filename is not defined` until switched to `new Worker(new URL(import.meta.url), ...)`.

## Decision Log

- Decision: Keep CLI runtime as a first-class fallback while adding SDK runtimes.
  Rationale: Avoid regressions and preserve current operating path while introducing SDK capabilities gradually.
  Date/Author: 2026-02-15 / Codex

- Decision: Implement Google integration in Node via official Google GenAI SDK path for this repository, and defer a Python sidecar Agent SDK approach unless required.
  Rationale: This repository is TypeScript/Node; direct Node SDK integration keeps deployment and test workflows consistent.
  Date/Author: 2026-02-15 / Codex

- Decision: Runtime mode selection will be explicit and observable in persisted run metadata.
  Rationale: Debugging and incident response require knowing exactly which runtime produced each step.
  Date/Author: 2026-02-15 / Codex

- Decision: Keep worker model identity (`codex_cli`/`gemini_cli`) separate from runtime mode (`cli`/`openai_sdk`/`google_sdk`) instead of introducing new worker model enums.
  Rationale: This preserves current public behavior while allowing the same logical worker profile to run through different execution backends.
  Date/Author: 2026-02-15 / Codex

- Decision: Fallback behavior is runtime-execution-level and controlled by `fallbackPolicy`, defaulting to `on_error`.
  Rationale: It gives deterministic resilience without hiding failures; fallback is explicitly recorded in step metadata (`fallbackFrom`).
  Date/Author: 2026-02-15 / Codex

## Outcomes & Retrospective

Completed outcome:

- Orchestration now supports runtime mode selection at worker registration and dispatch time, with server-level default runtime wiring.
- OpenAI and Google SDK runtimes are implemented and selectable, while CLI remains the default path and fallback target.
- Fallback is deterministic and observable: when an SDK path fails and policy allows downgrade, runs continue through CLI and record `fallbackFrom`.
- Contract and integration coverage was updated to prevent interface drift and to assert fallback semantics.
- Release gates are green (`tsc`, `verify`, `test`) and probe suite is green after fixing two probe regressions discovered during execution.

Remaining gaps:

- Live credentialed SDK end-to-end dispatch against external APIs is not part of automated CI and still depends on runtime environment secrets.

Lessons learned:

- Probe quality matters for production confidence; the two failing probes surfaced real maintenance debt that would otherwise mask runtime readiness.

## Context and Orientation

The orchestration system already exists and is composed of these key files:

- `contracts/worker_orchestrator.contract.ts`: Defines worker/run schemas, orchestration interfaces, and dispatch strategies.
- `src/lib/helpers/worker_runtime.helper.ts`: Current runtime helper that executes CLI commands with no shell mode, bounded output capture, and timeout kill logic.
- `src/lib/adapters/worker_orchestrator.adapter.ts`: Core orchestration engine that selects workers, runs strategies, and persists run history.
- `src/lib/providers/orchestration.provider.ts`: MCP tool surface (`spawn_worker`, `dispatch_task`, `list_worker_runs`, etc.).
- `contracts/store.contract.ts`: Persisted store schema, including `workers` and `worker_runs`.
- `src/lib/helpers/server_bootstrap.ts`: Runtime wiring and provider registration.
- `tests/contract/worker_orchestrator.test.ts` and `tests/integration/worker_orchestrator_workflows.test.ts`: Existing baseline tests.

Plain-language term definitions used in this plan:

- Runtime mode: The mechanism used to run a worker step. In this repo it will be one of `cli`, `openai_sdk`, or `google_sdk`.
- Fallback: Automatic downgrade from preferred runtime to another runtime when the preferred one is unavailable or fails in a retry-safe way.
- Parity: Same observable orchestration behavior (task dispatch success/failure semantics, run history shape, strategy sequencing) regardless of runtime mode.

## Plan of Work

Milestone 1 establishes the SDK foundations without changing behavior. This adds dependencies and extends contracts/schema to represent runtime mode explicitly. Existing CLI dispatch behavior must remain default and unchanged.

Milestone 2 adds OpenAI SDK execution as a concrete runtime implementation behind the existing `IWorkerRuntime` abstraction. It must be selectable and include clear run metadata identifying SDK mode.

Milestone 3 adds Google SDK execution with the same abstraction and the same observable semantics. The adapter must normalize output and errors so orchestration strategies can remain runtime-agnostic.

Milestone 4 adds runtime selection policy and deterministic fallback rules in orchestration adapter logic. Policy must allow default server-level configuration and optional per-worker override, while refusing unknown/unsafe modes.

Milestone 5 adds comprehensive tests and probes. Contract tests must verify schema shape and runtime metadata. Integration tests must run at least one strategy in each runtime mode and verify run persistence and status transitions. Probes must verify credentials/tool readiness non-destructively.

Milestone 6 hardens and finalizes. This includes documentation updates for operations, evidence capture, and final gate runs.

## Concrete Steps

Run every command from repository root: `/Users/hbpheonix/mcp-collaboration-server`.

1. Install dependencies and lock versions.

    npm install --cache .npm-cache openai @google/genai

Expected result:

    package-lock.json updates with resolved `@google/genai` entries.

2. Extend contracts and schema.

    - Edit `contracts/worker_orchestrator.contract.ts` to add runtime mode schema and runtime metadata fields.
    - Edit `contracts/store.contract.ts` if needed to persist any new runtime policy fields.
    - Edit `fixtures/worker_orchestrator/default.json` and `fixtures/worker_orchestrator/fault.json` to include runtime-mode scenarios.

3. Add SDK runtime implementations.

    - Create `src/lib/helpers/worker_runtime_openai_sdk.helper.ts`.
    - Create `src/lib/helpers/worker_runtime_google_sdk.helper.ts`.
    - Keep `src/lib/helpers/worker_runtime.helper.ts` as CLI runtime.
    - Ensure all runtime helpers implement the same interface with normalized outputs.

4. Add runtime selector and fallback policy.

    - Edit `src/lib/adapters/worker_orchestrator.adapter.ts` to choose runtime per worker or server default.
    - Edit `src/lib/helpers/server_bootstrap.ts` to wire runtime policy from env (`MCP_WORKER_RUNTIME_DEFAULT`, optional fallback policy flags).
    - Persist selected runtime and fallback events into run metadata for observability.

5. Add tests and probes.

    - Extend `tests/contract/worker_orchestrator.test.ts` for runtime metadata and mode validation.
    - Extend `tests/integration/worker_orchestrator_workflows.test.ts` for CLI and SDK mode dispatch parity.
    - Add/extend unit tests for selector/fallback logic (new file `tests/unit/worker_runtime_selector.test.ts`).
    - Add probe `probes/worker_orchestrator_sdk.probe.ts` to capture SDK readiness evidence.

6. Validate and capture evidence.

    npx tsc -p tsconfig.json
    npm run verify
    npm test
    npm run probes

Expected result:

    TypeScript passes, mandate scan passes, all tests pass, and probe fixtures refresh with SDK readiness output.

## Validation and Acceptance

Acceptance is behavioral and must be demonstrated by commands and stored run outputs:

- A user can register workers and set runtime mode policy.
- A user can dispatch one task with runtime `cli` and another with runtime `openai_sdk` (and `google_sdk` when configured).
- `list_worker_runs` shows completed runs with runtime metadata that matches actual execution mode.
- Strategy behavior remains intact for at least:
  - `single_worker`
  - `codex_writes_gemini_reviews`
  - `security_redteam_pass`
- If preferred runtime is unavailable and fallback policy allows downgrade, run completes through fallback mode and explicitly records fallback in run metadata.

Validation commands:

    npx tsc -p tsconfig.json
    npm run verify
    npm test

If SDK credentials are configured in environment, also run orchestrator integration scenario to prove SDK path is active; if credentials are absent, tests must still pass using mocked runtime hooks and CLI mode.

## Idempotence and Recovery

These steps are safe to re-run:

- Dependency installation with the same package set is idempotent.
- Contract/test/probe edits are additive and can be validated repeatedly.
- Gate commands can be run any number of times without data loss.

If a milestone fails midway:

- Re-run `npx tsc -p tsconfig.json` first to stabilize compile state.
- Re-run the smallest affected test file before full suite.
- Keep CLI runtime default intact until SDK mode parity is proven.
- Do not remove CLI fallback until SDK mode is validated and reviewed.

## Artifacts and Notes

Important evidence examples to capture as indented snippets during execution:

    > npm test
    ...
    ✔ WorkerOrchestratorAdapter ... pass
    ✔ Worker Orchestrator Workflows ... pass

    > list_worker_runs
    [
      {
        "id": "...",
        "strategy": "codex_writes_gemini_reviews",
        "status": "completed",
        "steps": [
          { "workerName": "codex-writer", "runtimeMode": "openai_sdk", ... },
          { "workerName": "gemini-review", "runtimeMode": "google_sdk", ... }
        ]
      }
    ]

## Interfaces and Dependencies

Dependencies to use:

- Existing: `@openai/codex` (already present in `package.json`).
- New: `@google/genai` for Node-native Google SDK runtime.

Required interface outcomes at the end of implementation:

- `contracts/worker_orchestrator.contract.ts` must define:
  - runtime mode type/schema (`cli`, `openai_sdk`, `google_sdk`)
  - run-step metadata that includes runtime mode
  - runtime policy input shape (default mode and fallback behavior)

- `src/lib/helpers/worker_runtime.helper.ts` remains CLI runtime implementation.
- `src/lib/helpers/worker_runtime_openai_sdk.helper.ts` implements `IWorkerRuntime`.
- `src/lib/helpers/worker_runtime_google_sdk.helper.ts` implements `IWorkerRuntime`.
- `src/lib/adapters/worker_orchestrator.adapter.ts` must choose runtime deterministically and record runtime/fallback metadata.

No exposed runtime adapter/provider may contain placeholders, dead branches, or unreachable policy paths.

Revision Note (2026-02-15 19:08Z): Replaced the prior phase-only plan with a full ExecPlan and added repository-level ExecPlan governance files (`AGENTS.md` update and `.agent/PLANS.md`). Reason: user requested OpenAI-style PLANS/AGENTS workflow and a complete plan from current CLI orchestration state to SDK-enabled orchestration delivery.
Revision Note (2026-02-15 05:22Z): Updated all living sections after full implementation and validation. Reason: SDK runtimes, fallback policy, tests, and probes were completed and required evidence/design updates for restartability from this document alone.
