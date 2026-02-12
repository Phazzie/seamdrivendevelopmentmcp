# Handoff: Production Hardening Plan (Wu Bob Review)
Date: 2026-02-10
Audience: The Haters, Wu Bob
Status: Draft for review

## Objective
Ship a production-safe release with zero known security escapes, zero compile debt, and zero placeholder runtime seams.

## Completed First (Quick Win #15)
- Added strict release gate doc: `docs/PRODUCTION_RELEASE_CHECKLIST.md`.
- This is now the official go/no-go criteria set for release decisions.

## Execution Plan (All 15 Quick Wins)

### Phase 0: Freeze and Gate Setup (same day)
1. Quick Win #11: create `release-hardening` freeze policy.
2. Quick Win #15: enforce go/no-go checklist (done).
3. Quick Win #14: pin runtime/toolchain versions.

Exit gate:
- Freeze announced.
- Checklist adopted.
- Runtime pin merged.

### Phase 1: Restore Green Baseline (P0)
1. Quick Win #1: fix compile blockers.
2. Quick Win #9: strengthen mandate checks to fail on `NYI` and placeholder production tests.
3. Quick Win #12: add CI gate for dead runtime code and `NYI` in exposed seams.

Exit gate:
- `npx tsc -p tsconfig.json` passes.
- `npm run verify` passes with new checks.
- CI fails correctly on synthetic `NYI` injection.

### Phase 2: Security Closure (P0)
1. Quick Win #2: patch `PathGuard` and `JailedFs` boundary logic.
2. Quick Win #3: add exploit regressions for prefix/symlink/external-root bypass.

Exit gate:
- All jail exploit regressions pass.
- No known path escape reproductions remain.

### Phase 3: Production Surface Prune (P0/P1)
1. Quick Win #5: remove/disable dead adapter exposure (`web.adapter.ts`).
2. Quick Win #6: implement or de-expose `test_seam` (`NYI` removal).
3. Quick Win #13: add core-tools contract matrix test.

Exit gate:
- No dead exposed adapter/provider.
- No `NYI` in runtime paths.
- Core tools matrix green.

### Phase 4: Real Runtime Confidence (P1)
1. Quick Win #4: migrate key "real" tests off `MockStore` to `StoreAdapter` (tasks/messages/agents/status first).
2. Quick Win #8: add integration smoke for tool registry + invocation flow.
3. Quick Win #7: bootstrap startup health checks.

Exit gate:
- Real-store contract/integration tests green.
- Startup self-checks enforced.
- Tool registry smoke test green.

### Phase 5: SDD and Fixture Hygiene (P1)
1. Quick Win #10: refresh stale fixtures and enforce freshness in CI.

Exit gate:
- Fixture freshness checks green or waivers documented.
- SDD evidence complete for release-critical seams.

## Efficiency Notes (Why this order)
- Phase order follows risk and dependency: compile -> security -> exposed surface -> confidence -> hygiene.
- Prevents wasted work by refusing to optimize features before baseline and safety are green.
- Keeps tech debt at zero by forbidding placeholders and dead runtime seams before release.

## Review Questions for Wu Bob
1. Keep `run_probe` and `scaffold_seam` production-exposed or internal-only for this release?
2. Should fixture freshness be hard-fail globally, or only for release-critical seams?
3. Should dead-code CI gate block on all seams or only exported/runtime-wired seams?

## Proposed Approval Condition
Approve plan only if all Phase exit gates are mandatory and checklist remains a strict NO-GO control.
