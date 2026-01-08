# Implementation Plan: Meta-Tools & Advanced Suites (SDD)

This document outlines the Seam-Driven Development path for the remaining infrastructure and intelligence tools.

> **Note:** The Meta-Cognition Suite (Confidence/Mood) is paused to focus on Efficiency & Planning.

---

## 1. The Meta-Tools (Development Infrastructure)

### A. `scaffold_seam` (The Builder)
**Goal:** Automate the creation of Contract, Probe, Mock, Test, and Adapter files to enforce SDD.
*   **Seam:** Filesystem (Writing Templates).
*   **Contract:** `contracts/scaffolder.contract.ts`
    *   Input: `SeamName` (string), `TargetDir` (string).
    *   Output: `GeneratedFiles` (list of paths).
*   **Probe:** `probes/fs_template_write.ts`
    *   Verifies that `fs.writeFileSync` creates files with the expected permissions and encoding in the target OS environment.
*   **Mock:** `src/lib/mocks/scaffolder.mock.ts`
    *   Simulates file creation by writing to an in-memory Map instead of the disk.
*   **Adapter:** `src/lib/adapters/scaffolder.adapter.ts`
    *   Uses a templating engine (or simple string interpolation) to write the 5 boilerplate files.

### B. `run_probe` (The Verifier)
**Goal:** Run executable probes and update fixtures.
*   **Seam:** Child Process Execution (`exec`/`spawn`).
*   **Contract:** `contracts/probe_runner.contract.ts`
    *   Input: `ProbePattern` (glob).
    *   Output: `ProbeResult` (success/fail, stdout, fixture_updated: boolean).
*   **Probe:** `probes/probe_runner.probe.ts`
    *   Verifies how `child_process.spawn` handles exit codes and stdout capturing on this OS.
*   **Mock:** `src/lib/mocks/probe_runner.mock.ts`
    *   Simulates running a probe and returning synthetic JSON output without actually spawning processes.
*   **Adapter:** `src/lib/adapters/probe_runner.adapter.ts`
    *   Iterates through `probes/*.ts`, compiles them on-the-fly (via `ts-node` or `tsc`), runs them, and captures the result.

---

## 2. The Planning & Management Suite (Efficiency)

### A. Plan Builder (`build_plan`)
**Goal:** Convert structured JSON into a Markdown plan in the standard format.
*   **Seam:** Markdown Composition.
*   **Contract:** `contracts/build_plan.contract.ts`
    *   Input: `PlanInput` (title + sections + checklist items).
    *   Output: `markdown` (string).
*   **Probe:** `probes/build_plan.probe.ts`
    *   Verifies output format (`##` headers + `- [ ]` items + nested subitems).
*   **Mock:** `src/lib/mocks/build_plan.mock.ts`.
*   **Adapter:** `src/lib/adapters/build_plan.adapter.ts`
    *   Produces the canonical Markdown plan text.

### B. Plan Decomposer (`decompose_plan`)
**Goal:** Convert a Markdown Plan into atomic, tracked Tasks in the store.
*   **Seam:** Markdown Parsing.
*   **Contract:** `contracts/plan_parser.contract.ts`
    *   Input: `MarkdownContent` (string).
    *   Output: `Task[]` (Title, Description). Dependencies are deferred in V1.
*   **Probe:** `probes/plan_parser.probe.ts`
    *   Verifies parsing of nested checklists and headers.
*   **Mock:** `src/lib/mocks/plan_parser.mock.ts`.
*   **Adapter:** `src/lib/adapters/plan_parser.adapter.ts`
    *   Parses Markdown into task-shaped objects.

### C. Work Distributor (`divvy_work`)
**Goal:** Intelligently assign unassigned tasks based on Agent Role and Load.
*   **Seam:** Scheduling Logic (Pure Function).
*   **Contract:** `contracts/scheduler.contract.ts`
    *   Input: `UnassignedTasks[]`, `AgentAvailability`.
    *   Output: `Assignments` (TaskId -> AgentId).
*   **Mock:** `src/lib/mocks/scheduler.mock.ts`.
*   **Adapter:** `src/lib/adapters/scheduler.adapter.ts`
    *   Implements the logic: "If task is 'Review', assign to Follower. If 'Implement', assign to Leader."

### D. Dependency Manager (`link_tasks`)
**Goal:** Block tasks until prerequisites are met to prevent agents from working out of order.
*   **Seam:** Graph State (Store).
*   **Contract:** `contracts/dependency.contract.ts`
    *   Methods: `addDependency(childId, parentId)`, `removeDependency(childId, parentId)`, `getDependencies(taskId)`, `listActionable(status?)`.
*   **Mock:** `src/lib/mocks/dependency.mock.ts`.
*   **Adapter:** `src/lib/adapters/dependency.adapter.ts`
    *   Updates the `Task` schema to include `blockedBy: uuid[]`.
    *   MCP tools: `add_dependency`, `remove_dependency`, `get_dependencies`, `list_actionable_tasks`.

---

## 3. The Intelligence Suite (Long-Term Memory)

### A. Shared Knowledge Graph
**Goal:** Persistent storage for architectural insights.
*   **Seam:** Graph/Document Store (JSON File or SQLite).
*   **Contract:** `contracts/knowledge.contract.ts`
    *   Methods: `addNode(type, content)`, `linkNodes(from, to, relation)`, `query(params)`.
*   **Probe:** `probes/graph_persistence.ts`
    *   Verifies the performance of reading/writing a large JSON graph vs a simple flat file.
*   **Mock:** `src/lib/mocks/knowledge.mock.ts`
    *   In-memory graph structure supporting queries.
*   **Adapter:** `src/lib/adapters/knowledge.adapter.ts`
    *   Extends the `StoreAdapter` to include a `knowledge` key in `collaboration_store.json`.

### B. Decision Records (ADR)
**Goal:** Immutable log of architectural decisions.
*   **Seam:** Append-Only Log (Store).
*   **Contract:** `contracts/adr.contract.ts`
    *   Schema: `id`, `title`, `status` (proposed/accepted), `context`, `decision`.
*   **Probe:** `probes/immutability_check.ts`
    *   Verifies that we can efficiently append to a list without reading the entire history (if utilizing a separate file) or optimizing the Store read.
*   **Mock:** `src/lib/mocks/adr.mock.ts`.
*   **Adapter:** `src/lib/adapters/adr.adapter.ts`.
