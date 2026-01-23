<!-- Purpose: Master guide for Seam-Driven Development in this repo (seam: docs) -->
# Seam-Driven Development (SDD) Master Guide (V1.2.0)

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

---

## 4) THE SUPREME LAWS (Mandatory)

### Law 1: The Linter is Law
- **MANDATORY:** Run `npm run verify` before and after every implementation turn.
- **FORBIDDEN:** `process.cwd()`, `as any`, `*Sync` IO, and **Forbidden Handshakes** (Adapters importing other Adapters).

### Law 2: The Red Proof (No Code Before Fault)
You may not write Adapter logic until:
- [ ] **Fault Fixture** exists in `fixtures/`.
- [ ] **Contract Test** explicitly **FAILS** against the Mock using the Fault Fixture.

### Law 3: JailedFS Sovereignty
- Adapters are physically FORBIDDEN from importing `fs` or `fs/promises`.
- They MUST use the injected `JailedFs` helper. If you can't import `fs`, you can't break the jail.

### Law 4: Dependency Injection Sovereignty
- Every adapter and mock MUST be "Path Blind."
- All resources MUST be injected via constructors. No magic strings or hardcoded paths.

### Law 5: Sharding Integrity
- The Store is sharded. Updates MUST write the Shard first, then the Manifest (`store.json`) last.
- If the Manifest is not updated, the transaction is void.

---

## 5) EMERGENCY PROTOCOLS

### THE SHADOWBOXER PROTOCOL
If you notice a mandate violation mid-generation:
- **STOP GENERATING IMMEDIATELY.**
- Write: `⚠️ CAUGHT VIOLATION: [description]`
- Restart the entire block from scratch. Do NOT "fix it later."

### THE HOLLOW SHELL (API UNCERTAINTY)
When using any API (Zod, Blessed, Node native):
- If uncertain of exact syntax, write: `⚠️ API UNCERTAINTY: I'm inferring [X] syntax`.
- Check actual file patterns in the codebase over guessing from training data.

---

## 6) THE ADVERSARIAL TRIBUNAL (The Haters)
Before choosing an implementation path, you MUST draft:
- **Path A (The Probable):** The common, "helpful" shortcut.
- **Path B (The Rigorous):** The DI-compliant, durable, failing-test-first way.

**ACTION:** You are forbidden from choosing Path A unless all three personas unanimously approve:
- **The Pragmatist:** "Does this survive a power cut?" (Atomicity/Durability).
- **The Hawk:** "Where is the IO bottleneck?" (Performance/Memory Cap).
- **The Snob:** "Is this modular?" (SOLID/Purity).

---

## 7) THE SDD WORKFLOW (The Liquid Loop)
Follow this order, no shortcuts:
1. **Contract**: `contracts/<seam>.contract.ts` (Zod schema + types + failure modes).
2. **Probe**: `probes/<seam>.probe.ts` (captures real behavior).
3. **Fixture**: `fixtures/<seam>/sample.json` and `fixtures/<seam>/fault.json`. Fixtures MUST be < 7 days old.
4. **Mock**: `src/lib/mocks/<seam>.mock.ts` (loads fixtures by `scenario`).
5. **Test**: `tests/contract/<seam>.test.ts` (Red Proof Failure + Success).
6. **Implement**: `src/lib/adapters/<seam>.adapter.ts` (real I/O via JailedFs).

---

## 8) THE COMPLIANCE REPORT (Mandatory Footer)
Every response involving a file change or tool call MUST end with this block:
```
COMPLIANCE REPORT:
- Seam: [Name]
- Linter: [npm run verify result]
- Red Proof: [Fixture Path & Failure Result]
- Shard Consistency: [Confirmed Manifest updated last]
- Memory Safety: [Log truncation verified]
- Mirror-Draft: [Path A vs B decision]
- Vocabulary Check: [Refresh status]
- Mid-Generation Violations: [None/Description]
```

---

## 9) The Avant-Garde Hook System
Contributors are assisted by a cybernetic hook system (`.gemini/hooks/`) that enforces rigor automatically.

| Hook | Trigger | Purpose |
| :--- | :--- | :--- |
| **Holodeck** | `BeforeModel` | Auto-injects Contract definitions when you mention a Seam. |
| **No-Any** | `BeforeTool` | **BLOCKS** writing `as any`. Zero tolerance. |
| **Anti-Sloth** | `BeforeTool` | **BLOCKS** lazy placeholders like `// ...`. |
| **Fantasy Killer** | `BeforeTool` | **BLOCKS** mocks that don't load `fixtures/`. |
| **Voice of Reason** | `BeforeModel` | Injects this Protocol into the AI context window. |

---

## 10) Final Note
SDD is not bureaucracy. It is a safety net for AI-assisted engineering. If a rule feels "slow," assume it is protecting you from a silent failure. The fastest path to correctness is the one that proves every boundary with reality, then enforces it mechanically.
