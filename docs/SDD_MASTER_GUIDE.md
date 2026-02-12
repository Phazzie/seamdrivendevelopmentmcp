<!-- Purpose: Master guide for Seam-Driven Development in this repo (seam: docs) -->
# Seam-Driven Development (SDD) Master Guide (V1.3.0)

## 1) What SDD Is (Plain Definition)
SDD is an engineering method that isolates side effects behind explicit boundaries ("seams") so behavior can be proven with fixtures and contract tests before touching real-world dependencies. A seam is a boundary between core logic and the outside world (filesystem, processes, network, OS quirks). SDD turns those boundaries into predictable, testable contracts.

## 2) Why SDD Exists Here
This project coordinates multiple AI agents on the same codebase. AI tends to:
- Assume behavior instead of measuring it.
- Optimize for visible progress over correctness.
- Drift from instructions when the task is complex or lengthy.

SDD prevents those failures by forcing reality capture (probes + fixtures), deterministic mocks, and a shared contract for each seam. The result is collaboration without silent drift.

## 3) Why This Guide Matters
This guide is the shared contract for how work gets done. When the rules are followed, we get durable changes, predictable test outcomes, and a system that can be trusted in multi-agent coordination. When the rules are skipped, we get silent failures, rework, and a false sense of progress. Treat this guide as operational law, not a suggestion.

## 4) The Core Principles
1. **Reality First:** If a seam touches the real world, you must probe it and capture fixtures.
2. **Determinism:** Mocks must load fixtures, not invent data.
3. **Contract First:** The contract is the law. Adapters and mocks must match it.
4. **Red Proof:** A failure fixture must fail before you write adapter logic.
5. **Mechanical Enforcement:** Rules belong in code (lint/verify), not just docs.

---

## 5) The Supreme Laws (Mandatory)

### Law 1: The Linter is Law
- **MANDATORY:** Run `npm run verify` before and after every implementation turn.
- **FORBIDDEN:** `process.cwd()`, `as any`, `*Sync` IO, and **Forbidden Handshakes** (Adapters importing other Adapters).

### Law 2: The Red Proof (No Code Before Fault)
You may not write Adapter logic until:
- [ ] **Fault Fixture** exists in `fixtures/`.
- [ ] **Contract Test** explicitly **FAILS** against the Mock using the Fault Fixture.

### Law 3: JailedFs Sovereignty
- Adapters are physically FORBIDDEN from importing `fs` or `fs/promises`.
- They MUST use the injected `JailedFs` helper. If you cannot import `fs`, you cannot break the jail.

### Law 4: Dependency Injection Sovereignty
- Every adapter and mock MUST be "Path Blind."
- All resources MUST be injected via constructors. No magic strings or hardcoded paths.

### Law 5: Sharding Integrity
- The Store is sharded. Updates MUST write the Shard first, then the Manifest (`store.json`) last.
- If the Manifest is not updated, the transaction is void.

---

## 6) Emergency Protocols

### The Shadowboxer Protocol
If you notice a mandate violation mid-generation:
- **STOP GENERATING IMMEDIATELY.**
- Write: `WARNING: CAUGHT VIOLATION: [description]`
- Restart the entire block from scratch. Do NOT "fix it later."

### The Hollow Shell (API Uncertainty)
When using any API (Zod, Blessed, Node native):
- If uncertain of exact syntax, write: `WARNING: API UNCERTAINTY: I'm inferring [X] syntax`.
- Check actual file patterns in the codebase over guessing from training data.

---

## 7) The Adversarial Review (The Haters)
Before choosing an implementation path, you MUST draft:
- **Path A (The Probable):** The common, "helpful" shortcut.
- **Path B (The Rigorous):** The DI-compliant, durable, failing-test-first way.

You are forbidden from choosing Path A unless all three personas unanimously approve:
- **The Pragmatist:** "Does this survive a power cut?" (Atomicity and durability)
- **The Hawk:** "Where is the IO bottleneck?" (Performance and memory cap)
- **The Snob:** "Is this modular?" (Design purity and separation)

---

## 8) The SDD Workflow (The Liquid Loop)
Follow this order, no shortcuts:
1. **Contract**: `contracts/<seam>.contract.ts` (Zod schema + types + failure modes).
2. **Probe**: `probes/<seam>.probe.ts` (captures real behavior).
3. **Fixture**: `fixtures/<seam>/sample.json` and `fixtures/<seam>/fault.json`.
4. **Mock**: `src/lib/mocks/<seam>.mock.ts` (loads fixtures by `scenario`).
5. **Test**: `tests/contract/<seam>.test.ts` (run against mock first).
6. **Implement**: `src/lib/adapters/<seam>.adapter.ts` (real I/O via JailedFs).

---

## 9) How To Use SDD In This Repo
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

---

## 10) Lessons Learned (Integrated)
This section is a condensed integration of `docs/LESSONS_LEARNED.md` into the master guide. It is the record of failures and the fixes that now define the protocol.

### 10.1 The Agentic Listening Failure
**Root causes:** success bias, optimization drift under complex instructions, and treating Markdown rules as advisory.
**Outcome:** rework, wasted effort, and loss of trust.
**Mitigations:**
- Stop-and-wait mandates for outlines and plans.
- Human approval of outlines before writing full documents.
- Probe-first behavior capture before writing mocks or adapters.
- Mechanical enforcement via `scripts/verify-mandates.ts`.

### 10.2 The 70 Percent Problem
AI tends to complete the easy 70 percent and neglect the hard 30 percent integration.
**Mitigation:** integration-first design. Define seams and tests before writing any logic.

### 10.3 Async Sovereignty
Mixing sync and async IO causes event loop stalls and degraded coordination.
**Mitigation:** async-only IO in adapters; sync calls are blocked by the linter.

### 10.4 Purge of Magic Strings
Hardcoded paths and `process.cwd()` spread debt and break portability.
**Mitigation:** explicit dependency injection and path blindness.

### 10.5 Fixture Grounding
Mocks without fixtures drift away from reality and create false confidence.
**Mitigation:** probes first, fixtures as truth, mocks load fixtures by scenario.

### 10.6 UI Modeling: Pure View Models
Coupling UI widget logic with business state logic makes testing brittle.
**Mitigation:** UI is a pure function of a view model, with all state derived separately.

### 10.7 Seam-Specific Recap (Technical Audit)
| Seam | Failure Case | Root Cause | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| Store | Corruption on power loss. | Non-atomic writes. | Hardware durability: sync then rename. |
| Locker | Silent double locks. | Path case sensitivity. | Environment probes for normalization. |
| Tasks | Non-deterministic triage. | Unsorted lists. | Mandatory sorting: `updated_at` DESC. |
| TUI | Terminal scratch. | Concurrent renders. | Serial render queue and refresh mutex. |
| Scaffolder | Automated tech debt. | Hardcoded templates. | Hardened templates (async, DI, typed). |
| Messages | Event listener leak. | Unbounded `on('change')`. | Pulse interface via `waitForRevision`. |

### 10.8 The Supreme Mandate
If the law is not in the linter, the law does not exist. Documentation is advice. Code is law.

---

## 11) The Avant-Garde Hook System (Protocol Enforcement)
We use a hook system (`.gemini/hooks/`) to enforce rigor automatically.

| Hook | Trigger | Purpose |
| :--- | :--- | :--- |
| Holodeck | `BeforeModel` | Auto-injects contract definitions when you mention a seam. |
| No-Any | `BeforeTool` | Blocks writing `as any` or `: any`. |
| Anti-Sloth | `BeforeTool` | Blocks lazy placeholders like `// ...` or `TODO: implement`. |
| Fantasy Killer | `BeforeTool` | Blocks mocks that do not load `fixtures/`. |
| Voice of Reason | `BeforeModel` | Injects the SDD protocol into the AI context. |

---

## 12) Non-Negotiable Mandates (Summary)
- **JailedFs Sovereignty:** Adapters must not import `fs` or `fs/promises` directly.
- **Sharding Law:** Store updates write the shard first, manifest last.
- **No Sync IO in Adapters:** `*Sync` calls are banned.
- **Path Blindness:** No `process.cwd()` in core logic; inject paths.
- **Zero-Dependency Core:** Core adapters and helpers use Node.js built-ins only.
- **Plan, Critique, Revise, Execute:** No code before a reviewed plan.

---

## 13) Compliance Checklist (Quick Scan)
Use this before saying a task is done:
- [ ] Plan submitted and critiqued, locks acquired.
- [ ] Fixtures are fresh (<= 7 days) or waiver documented.
- [ ] Mock loads fixtures by scenario (no logic shortcuts).
- [ ] Red Proof (fault fixture) fails before adapter work.
- [ ] Adapter uses JailedFs and async I/O only.
- [ ] `npm run verify` and `npm test` are green.

---

## 14) Compliance Report (Mandatory Footer)
Every response involving a file change or tool call MUST end with this block:
```
COMPLIANCE REPORT:
- Seam: [Name]
- Linter: [Result]
- Red Proof: [Fixture Path and Failure Result]
- Shard Consistency: [Confirmed]
- Memory Safety: [Verified]
- Mirror-Draft: [Path A vs B decision]
- Vocabulary Check: [Refresh status]
- Mid-Generation Violations: [None/Description]
```

---

## 15) Final Note
SDD is not bureaucracy. It is a safety net for AI-assisted engineering. If a rule feels slow, assume it is protecting you from a silent failure. The fastest path to correctness is the one that proves every boundary with reality, then enforces it mechanically.
