# SDD Waiver: `intent_verifier` Seam

- Timestamp (UTC): 2026-02-11T00:00:00Z
- Owner: release-owner-codex
- Seam: `intent_verifier`
- Current non-compliance:
  - missing probe
  - missing fixture
  - missing adapter
  - missing contract test

## Justification
- `intent_verifier` is not in exposed runtime wiring for production bootstrap.
- Runtime `ReviewGateAdapter` now uses concrete internal validation and no mock verifier injection.
- Release-critical runtime seams are compliant and covered by passing integration/security tests.

## Expiration / Exit Criteria
- Expire by: 2026-03-15
- Close waiver when:
  1. `intent_verifier` gets real adapter implementation.
  2. Probe + fixture + contract test are added.
  3. `get_sdd_report` marks seam compliant.

