# AGENTS.md - The Shared Brain Operating Manual (V1.2.0)

## 🚨 THE COMPLIANCE REPORT (MANDATORY)
Every agent response involving a file change or tool call **MUST** end with this block. Refer to `docs/SDD_MASTER_GUIDE.md` for definitions.

```
COMPLIANCE REPORT:
- Seam: [Name]
- Linter: [Result]
- Red Proof: [Fixture Path & Failure Result]
- Shard Consistency: [Confirmed]
- Memory Safety: [Verified]
- Mirror-Draft: [Path A vs B decision]
- Vocabulary Check: [Refresh status]
- Mid-Generation Violations: [None/Description]
```

## System Context & Constraints
- **OS:** macOS Monterey (darwin).
- **Package Management:** Run `npm install` with `--cache .npm-cache`.
- **Architectural Law:** Authority resides in `docs/SDD_MASTER_GUIDE.md`.

## Project Summary
Build and harden the MCP collaboration server for multi-agent coordination using Seam-Driven Development (SDD).

## Core Standard Operating Procedures (SOPs)

### 1. Starting Work
1.  **Identify:** Call `whoami`.
2.  **Sync:** Call `list_tasks` and `list_locks`.
3.  **Handoff:** Read `docs/agent-collab.md` and `handoffs/*.md`.

### 2. Feature Implementation (The Loop)
1.  **Plan:** Call `submit_plan` with full `affectedResources`.
2.  **Lock:** Call `request_file_locks`.
3.  **Develop:** Follow the SDD Loop (Contract -> Probe -> Mock -> Test -> Adapter).
4.  **Verify:** Run `npm test` and `npm run verify`.
5.  **Release:** Call `release_file_locks` only when 100% Green.

### 3. Conflict Resolution
1.  **Detection:** If a lock is held, check `list_audit` to see who has it.
2.  **Coordination:** Use `post_message` to request release or handoff.
3.  **Panic:** If the system is spiraling, call `trigger_panic`.

## Available MCP Tools
- **Identity:** `register_agent`, `whoami`, `list_agents`, `get_status`.
- **Tasks:** `create_task`, `update_task_status`, `list_tasks`, `add_dependency`, `divvy_work`.
- **Locks:** `request_file_locks`, `release_file_locks`, `list_locks`.
- **Review:** `submit_plan`, `submit_critique`, `approve_plan`.
- **Communication:** `post_message`, `list_messages`, `publish_event`, `list_events`, `wait_for_events`, `send_notification`.
- **Intelligence:** `knowledge_add_node`, `knowledge_link_nodes`, `knowledge_query`, `ideas_create`, `ideas_list`, `create_adr`.
- **Dev-Infra:** `run_probe`, `scaffold_seam`, `get_sdd_report`.

## Canonical Commands
- **Compile:** `npx tsc -p tsconfig.json`
- **Verify:** `npm run verify` (Mandate Linter).
- **Test:** `npm test` (Full suite).
- **Probes:** `npm run probes` (Fixture refresh).

## Project References
- **Law:** `docs/SDD_MASTER_GUIDE.md`.
- **Observability:** Web HUD at `http://localhost:3000` (Enable via `MCP_WEB_PORT`).
- **Truth:** `contracts/`, `fixtures/`, `probes/`.
- **Log:** `docs/agent-collab.md`.

## Execution Backbone
- Agents MUST treat `plan.md` as the active execution source of truth for production hardening and orchestrator delivery.
- Before coding, read `plan.md` and align current step status.
- After each completed step, update `plan.md` status/evidence and continue autonomously to the next item until blocked by an external dependency.
