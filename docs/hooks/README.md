# Experimental Hooks System

This project uses **Gemini CLI Hooks** to enforce Seam-Driven Development (SDD) rigor. These hooks act as an automated "Super-Ego" for the agent, preventing laziness and enforcing architectural standards.

## Active Hooks

| Hook Name | Trigger | Purpose |
| :--- | :--- | :--- |
| **Holodeck** | `BeforeModel` | **Auto-Context Injection.** Detects when you are working on a Seam (e.g., "audit") and instantly injects the `contracts/audit.contract.ts` into the context. |
| **Voice of Reason** | `BeforeModel` | **Protocol Enforcement.** Injects the "Seam-Driven Development Protocol" (Probe -> Contract -> Mock -> Adapter) and anti-shortcut mandates into every prompt. |
| **Anti-Sloth** | `BeforeTool` | **Laziness Block.** Scans code for `// ...`, `TODO`, or `throw new Error("Not implemented")`. Blocks the write if detected. |
| **No-Any** | `BeforeTool` | **Type Safety.** Scans code for `as any`. Blocks the write if detected. **Zero Tolerance.** |
| **No-Fantasy-Mocks** | `BeforeTool` | **SDD Integrity.** Prevents writing Mocks that do not load data from `fixtures/`. |
| **Ensure-Test-Exists**| `AfterTool` | **TDD Enforcement.** Checks if a Contract Test exists after you write an Adapter. Warns if missing. |
| **Mandate-Sentinel** | `AfterTool` | **Architecture Guard.** Runs `scripts/verify-mandates.ts` to check for `process.cwd()`, Sync I/O, and Forbidden Handshakes. |
| **Auto-Lint** | `AfterTool` | **Hygiene.** Runs `eslint --fix` on modified files. |

## Managing Hooks

Hooks are defined in `.gemini/settings.json`.

```bash
# View status
/hooks panel

# Disable a specific hook (e.g., if you REALLY need to use 'any' for debugging)
/hooks disable no-any
```

## The "Haters" Council
These hooks implement the will of our virtual architectural council:
*   **The Pragmatist:** Prevents broken builds.
*   **The Hawk:** Enforces efficiency.
*   **The Snob:** Enforces structure.
*   **Wu-Bob:** Enforces TDD/SDD.
