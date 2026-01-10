# Project Audit: MCP Collaboration Server
**Date:** 2026-01-09
**Auditor:** Gemini

## 1. Documentation Inventory & Categorization

| Document | Type | Status | Quality Assessment |
| :--- | :--- | :--- | :--- |
| `AGENTS.md` | Process / Protocol | 🟢 Excellent | Clear SDD mandates. Commands are slightly out of sync with `package.json`. |
| `MASTER_PLAN.md` | Specification | 🟡 Mixed | High-level architecture is accurate, but claims "Meta-Tools" are complete (some are missing). |
| `handoff.md` | Status Report | 🟡 Inaccurate | Claims `run_probe` CLI and MCP tools exist; they do not. |
| `PLAN_TUI.md` | Design Spec | 🟢 Implemented | Matches the `src/tui` implementation. |
| `REMAINING_WORK.md` | Roadmap | 🟡 Optimistic | Claims "All suites complete". Functionally true, but operational tooling is missing. |
| `README.md` | User Guide | 🔴 Critical | Empty. No entry point for new users. |
| `contracts/*.ts` | Technical Spec | 🟢 Excellent | The true source of truth. Verified by tests. |

## 2. Gap Analysis: "What it Says" vs. "Reality"

### A. The Meta-Tools (Development Infrastructure)
| Feature | Documentation Claim | Reality | Verdict |
| :--- | :--- | :--- | :--- |
| **Probe Runner** | `handoff.md`: "CLI: src/tools/probes.ts + npm run probes" | **MISSING**. No CLI file, no npm script. Adapter exists. | 🔴 **Missing** |
| **Scaffolder** | `handoff.md`: "CLI: src/tools/scaffold.ts" | **DONE**. File exists, script exists. | 🟢 **Verified** |
| **MCP Integration** | `handoff.md`: "MCP tool registration in src/index.ts" | **MISSING**. Neither `run_probe` nor `scaffold_seam` are exposed in `index.ts`. | 🔴 **Missing** |

### B. SDD Compliance & Hygiene
| Feature | Documentation Claim | Reality | Verdict |
| :--- | :--- | :--- | :--- |
| **Fixture Freshness** | `AGENTS.md`: "Fixtures captured <= 7 days old" | **FAILING**. `npm run sdd:check` fails with 9 stale/missing fixtures. | 🟠 **Degraded** |
| **Validation Tools** | `AGENTS.md`: "Use scripts/sdd-check.ts" | **DONE**. Script exists and works (correctly reports failure). | 🟢 **Verified** |

### C. Core Features (Suites)
| Feature | Documentation Claim | Reality | Verdict |
| :--- | :--- | :--- | :--- |
| **Management** | `MASTER_PLAN.md`: "divvy_work, link_tasks complete" | **DONE**. Tests pass, tools registered in `index.ts`. | 🟢 **Verified** |
| **Intelligence** | `MASTER_PLAN.md`: "knowledge, adr complete" | **DONE**. Tests pass, tools registered in `index.ts`. | 🟢 **Verified** |
| **Communication** | `MASTER_PLAN.md`: "events, notifications complete" | **DONE**. Tests pass, tools registered in `index.ts`. | 🟢 **Verified** |
| **TUI Cockpit** | `CHANGELOG.md`: "Mission Control V2 implemented" | **DONE**. `mission-control.sh` exists, `src/tui` populated. | 🟢 **Verified** |

## 3. What Needs to be Done (Prioritized)

1.  **Repair the "Probe Runner" Tooling:**
    *   Create `src/tools/probes.ts`.
    *   Add `probes` script to `package.json`.
    *   **Why:** We cannot refresh the stale fixtures (fixing SDD status) without this tool.

2.  **Expose Meta-Tools via MCP:**
    *   Register `run_probe` and `scaffold_seam` in `src/index.ts`.
    *   **Why:** `handoff.md` explicitly promised this, and it allows agents to self-maintain.

3.  **Refresh Fixtures:**
    *   Run the (newly restored) `npm run probes` to fix the 9 `sdd:check` errors.
    *   **Why:** Compliance with `AGENTS.md`.

4.  **Create Entry Point:**
    *   Write a proper `README.md` with setup, architecture summary, and command reference.
    *   **Why:** The project is opaque to new users.

5.  **Server Hardening (as per Handoff):**
    *   Implement `store.json` backups/rotation.
    *   Harden `AgentAdapter` persistence.

## 4. Summary
The "Application" layer (Agents, Tasks, TUI) is excellent and complete. The "Infrastructure" layer (SDD tooling, Documentation) has drifted from the spec, leaving the project in a fragile state where we can't easily verify or extend it without fixing the tooling first.
