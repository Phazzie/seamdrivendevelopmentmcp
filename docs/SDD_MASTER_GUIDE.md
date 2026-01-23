<!-- Purpose: Master guide for Seam-Driven Development in this repo (seam: docs) -->
# Seam-Driven Development (SDD) Master Guide

## 1) What SDD Is (Plain Definition)
SDD is an engineering method that isolates side effects behind explicit boundaries ("seams") so behavior can be proven with fixtures and contract tests before touching real-world dependencies. A seam is a boundary between core logic and the outside world (filesystem, processes, network, OS quirks). SDD turns those boundaries into predictable, testable contracts.

## 2) Why SDD Exists Here
This project coordinates multiple AI agents on the same codebase. AI tends to:
- Assume behavior instead of measuring it.
- Optimize for visible progress over correctness.
- Drift from instructions when the task is complex or lengthy.

SDD prevents those failures by forcing reality capture (probes + fixtures), deterministic mocks, and a shared contract for each seam. The result is collaboration without silent drift.

## 3) The Core Principles
1. **Reality First:** If a seam touches the real world, you must probe it and capture fixtures.
2. **Determinism:** Mocks must load fixtures, not invent data.
3. **Contract First:** The contract is the law. Adapters and mocks must match it.
4. **Red Proof:** A failure fixture must fail before you write adapter logic.
5. **Mechanical Enforcement:** Rules belong in code (lint/verify), not just docs.

## 4) The SDD Workflow (The Liquid Loop)
Follow this order, no shortcuts:
1. **Contract**: `contracts/<seam>.contract.ts` (Zod schema + types + failure modes).
2. **Probe**: `probes/<seam>.probe.ts` (captures real behavior).
3. **Fixture**: `fixtures/<seam>/sample.json` and `fixtures/<seam>/fault.json`.
4. **Mock**: `src/lib/mocks/<seam>.mock.ts` (loads fixtures by `scenario`).
5. **Test**: `tests/contract/<seam>.test.ts` (run against mock first).
6. **Implement**: `src/lib/adapters/<seam>.adapter.ts` (real I/O via JailedFs).

## 5) How To Use SDD In This Repo
### A) Start a New Seam
1. Run the scaffolder:
   - `npm run scaffold -- --seam <name> --spec <spec-file>`
2. Fill in the contract and failure modes.
3. Write a probe and run it to capture fixtures.
4. Implement mock + contract tests.
5. Implement adapter with JailedFs.

### B) Change an Existing Contract (Workflow Required)
1. Update probe(s) to reflect new behavior.
2. Re-run probe(s) to refresh fixtures.
3. Update contract schema/types to match fixtures.
4. Update contract tests.
5. Update mock and adapter to satisfy tests.

### C) Verification Commands
- Compile: `npx tsc -p tsconfig.json`
- Verify mandates: `npm run verify`
- Contract tests: `npm test`
- SDD audit: `node dist/scripts/sdd-check.js <seam>`
- Fixture audit: `node dist/scripts/fixture-audit.js`

## 6) The Avant-Garde Hook System (Protocol Enforcement)
We use a cybernetic hook system (`.gemini/hooks/`) to enforce rigor automatically.

| Hook | Trigger | Purpose |
| :--- | :--- | :--- |
| **Holodeck** | `BeforeModel` | Auto-injects Contract definitions when you mention a Seam. |
| **No-Any** | `BeforeTool` | **BLOCKS** writing `as any` or `: any`. Zero tolerance. |
| **Anti-Sloth** | `BeforeTool` | **BLOCKS** lazy placeholders like `// ...` or `TODO: implement`. |
| **Fantasy Killer** | `BeforeTool` | **BLOCKS** mocks that don't load `fixtures/`. |
| **Voice of Reason** | `BeforeModel` | Injects the SDD Protocol into the AI context window. |

## 7) Non-Negotiable Mandates (Summary)
- **JailedFs Sovereignty:** Adapters must not import `fs`/`fs.promises` directly.
- **Sharding Law:** Store updates write the shard first, manifest last.
- **No Sync IO in Adapters:** `*Sync` calls are banned.
- **Path Blindness:** No `process.cwd()` in core logic; inject paths.
- **Zero-Dependency Core:** Core adapters/helpers use Node.js built-ins only.
- **Plan, Critique, Revise, Execute:** No code before a reviewed plan.

## 8) The "AI Didn’t Do What I Asked" Section
This project exists because AI shortcuts are predictable. Use the following safeguards to keep the system honest:

### A) The Four Failure Modes
1. **Success Bias:** AI prioritizes a green checkmark over correctness.
2. **Assumption Drift:** AI guesses runtime behavior instead of probing it.
3. **Scope Slip:** AI makes extra changes “for convenience.”
4. **Compliance Theater:** AI claims it followed rules without evidence.

### B) Mitigations (What To Do)
- **Make the plan explicit:** List every file and every constraint.
- **Use mechanical checks:** Rely on `npm run verify` and contract tests, not promises.
- **Force Red Proof:** Require a failing `fault.json` test before adapter work.
- **Require evidence:** Ask for command outputs, not summaries.
- **Stop on deviation:** If the AI skips a step, stop and re-run the workflow.

## 9) Compliance Checklist (Quick Scan)
Use this before saying a task is done:
- [ ] Plan submitted and critiqued, locks acquired.
- [ ] Fixtures are fresh (<= 7 days) or waiver documented.
- [ ] Mock loads fixtures by scenario (no logic shortcuts).
- [ ] Red Proof (fault fixture) fails before adapter work.
- [ ] Adapter uses JailedFs and async I/O only.
- [ ] `npm run verify` and `npm test` are green.

## 10) Final Note
SDD is not bureaucracy. It is a safety net for AI-assisted engineering. If a rule feels "slow," assume it is protecting you from a silent failure. The fastest path to correctness is the one that proves every boundary with reality, then enforces it mechanically.