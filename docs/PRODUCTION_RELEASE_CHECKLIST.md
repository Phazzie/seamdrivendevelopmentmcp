# Production Release Checklist (Go/No-Go)

Purpose: enforce mechanical production readiness with strict pass/fail gates.

Rule: any failed or missing gate is an automatic NO-GO.

## 1. Build Integrity
- `PASS`: `npx tsc -p tsconfig.json` exits `0`.
- `FAIL`: any compile/type error.

## 2. Mandate Integrity
- `PASS`: `npm run verify` exits `0`.
- `FAIL`: any mandate violation or verify failure.

## 3. Test Integrity
- `PASS`: `npm test` exits `0` on clean checkout.
- `FAIL`: any failing or skipped required test.

## 4. Security Integrity (Path Jail)
- `PASS`: explicit regression tests for:
- sibling-prefix escape blocked
- symlink escape blocked
- external non-whitelisted writes blocked
- `FAIL`: any exploit succeeds.

## 5. Core Tooling Integrity
- `PASS`: core tool smoke suite succeeds (`list_tools` + representative `call_tool` for each core provider).
- `FAIL`: any core tool registration or invocation failure.

## 6. Persistence Integrity
- `PASS`: sharded store invariants hold under integration tests:
- stale revision retry behavior
- atomic shard/manifest update behavior
- panic-mode enforcement behavior
- review-gate lock enforcement behavior
- `FAIL`: any invariant breach.

## 7. Release Surface Integrity
- `PASS`: no `NYI` in exposed runtime code paths.
- `PASS`: no dead exposed adapters/providers.
- `FAIL`: any placeholder or unwired runtime seam.

## 8. Fixture and SDD Integrity
- `PASS`: seam fixtures are current or explicitly waived with timestamp and owner.
- `PASS`: contract/probe/mock/test/adapter evidence exists for release-critical seams.
- `FAIL`: stale fixture without waiver, or missing seam evidence.

## 9. Operations Integrity
- `PASS`: startup self-check verifies store path writable, schema loadable, and jail health.
- `PASS`: backup/restore runbook validated on current build.
- `FAIL`: startup check missing/failing, or runbook unverified.

## 10. Release Decision Record
- `PASS`: all sections above marked PASS with evidence links/command output summary.
- `PASS`: approver sign-off captured.
- `FAIL`: unsigned or incomplete record.

## Evidence Log (Fill Before Release)
- Build: [command, timestamp, result]
- Verify: [command, timestamp, result]
- Test: [command, timestamp, result]
- Security regressions: [test files, timestamp, result]
- Tool smoke: [test file, timestamp, result]
- Persistence: [integration tests, timestamp, result]
- Surface audit: [grep/report, timestamp, result]
- Fixture/SDD audit: [report, timestamp, result]
- Ops checks: [runbook step evidence, timestamp, result]

## Sign-Off
- Haters council: [name/date/decision]
- Wu Bob: [name/date/decision]
- Final release owner: [name/date/decision]

## Release Record (2026-02-11 UTC)
- Gate 1 Build Integrity: `PASS`
- Evidence: `evidence/release/2026-02-11/01_tsc.txt`
- Gate 2 Mandate Integrity: `PASS`
- Evidence: `evidence/release/2026-02-11/02_verify.txt`
- Gate 3 Test Integrity: `PASS`
- Evidence: `evidence/release/2026-02-11/03_test_full.txt`
- Gate 4 Security Integrity: `PASS`
- Evidence: `evidence/release/2026-02-11/04_security_regressions.txt`
- Gate 5 Core Tooling Integrity: `PASS`
- Evidence: `evidence/release/2026-02-11/05_tool_smoke.txt`
- Gate 6 Persistence Integrity: `PASS`
- Evidence: `evidence/release/2026-02-11/07_persistence_integrity.txt`
- Gate 7 Release Surface Integrity: `PASS`
- Evidence: `evidence/release/2026-02-11/08_surface_audit.txt`
- Gate 8 Fixture and SDD Integrity: `PASS (with waiver)`
- Evidence: `evidence/release/2026-02-11/09_sdd_report.json`
- Waiver: `evidence/release/2026-02-11/12_sdd_waiver_intent_verifier.md`
- Gate 9 Operations Integrity: `PASS`
- Evidence: `evidence/release/2026-02-11/10_ops_startup_check.txt`
- Evidence: `evidence/release/2026-02-11/13_backup_restore_validation.txt`
- Runbook: `docs/STORE_BACKUP_RESTORE_RUNBOOK.md`
- Gate 10 Release Decision Record: `READY FOR EXTERNAL SIGN-OFF`

## Decision Summary (2026-02-11 UTC)
- Recommendation: `GO` after external approver signatures.
- Open approvals: Haters council, Wu Bob, Final release owner.
