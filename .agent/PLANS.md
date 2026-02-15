# Codex Execution Plans (ExecPlans)

This file defines the required format and quality bar for an ExecPlan used by coding agents in this repository. An ExecPlan is a living design-and-implementation document that must be sufficient for a novice to deliver the feature from a cold start with only the working tree and the ExecPlan itself.

## When to use an ExecPlan

Use an ExecPlan whenever work is complex, multi-step, risky, or crosses multiple seams. This includes major refactors, runtime architecture changes, security hardening, and SDK migrations.

## Non-negotiable rules

- Every ExecPlan must be self-contained. Define every term and assumption directly in the plan.
- Every ExecPlan must be a living document. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` up to date as work proceeds.
- Every ExecPlan must describe observable behavior, not only code edits.
- Every ExecPlan must state exact files to edit, exact commands to run, and expected outcomes.
- Every ExecPlan must include idempotence/recovery guidance so work can be resumed safely after interruption.
- When revising the plan, add a revision note at the bottom stating what changed and why.

## Required sections

Every ExecPlan in this repository must include these sections in order:

1. `Purpose / Big Picture`
2. `Progress` (checkbox list with timestamps)
3. `Surprises & Discoveries`
4. `Decision Log`
5. `Outcomes & Retrospective`
6. `Context and Orientation`
7. `Plan of Work`
8. `Concrete Steps`
9. `Validation and Acceptance`
10. `Idempotence and Recovery`
11. `Artifacts and Notes`
12. `Interfaces and Dependencies`

## Formatting rules

- ExecPlans are Markdown and prose-first.
- Use plain language and define unfamiliar terms immediately.
- Avoid tables/checklists except where mandatory (`Progress` checkboxes are mandatory).
- When including command examples or snippets, use indented blocks.
- If the plan file contains only the ExecPlan content, do not wrap the full file in triple backticks.

## Implementation behavior while executing an ExecPlan

- Do not stop to ask for “next steps” when the plan already defines a next milestone.
- Update the plan whenever progress changes or discoveries alter design choices.
- Prefer additive and testable changes over big-bang rewrites.
- Run project gates frequently and record evidence directly in the plan.

## SDD-specific expectations

- Respect Seam-Driven Development order when adding capability: `Contract -> Probe -> Mock -> Test -> Adapter -> Provider wiring`.
- Add regression tests for every bug fix.
- Keep exposed runtime paths free of placeholders and dead adapters.
