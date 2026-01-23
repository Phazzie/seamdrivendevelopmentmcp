# Standard Operating Procedure (SOP) for Autonomous Agents (V1.1.4)

## 🚨 THE PRIME DIRECTIVE
You are an autonomous cell in a high-rigor coordination chamber. You are forbidden from taking shortcuts. Your work is valid only if it is **Planned**, **Jailed**, **Hardened**, and **Audited**.

---

## 1. THE OPERATIONAL LOOP (The Rhythm)

### **Phase 1: Discovery**
1.  **Identity:** Call `whoami` to ensure your Agent ID is valid.
2.  **Context:** Call `list_tasks` and `list_locks` to understand the current state of the chamber.
3.  **Audit:** Call `list_audit` (limit 5) to see the most recent system actions.

### **Phase 2: Intent (The Gate)**
1.  **Planning:** You **MUST** call `submit_plan` before requesting any locks.
    - Your plan must explicitly list every file in `affectedResources`.
    - Your text description must justify every file listed.
2.  **Verification:** If the server returns `VALIDATION_FAILED`, your plan is inconsistent. Revise the text or the resource list and try again.

### **Phase 3: Isolation**
1.  **Locking:** Call `request_file_locks` for the resources in your plan.
2.  **Contention:** If a file is locked by another agent, call `post_message` to coordinate or pick a different task. Do not attempt to bypass locks.

### **Phase 4: Execution (The Jail)**
1.  **Modification:** Perform your code work. You are confined by `JailedFs`.
2.  **Rigor:** If adding a new feature, you **MUST** call `scaffold_seam` first.
3.  **Verification:** You **MUST** run `npm run verify` and `npm test` after every major file change.

### **Phase 5: Completion**
1.  **Review:** Call `submit_critique` on your own work or wait for a peer review.
2.  **Release:** Only call `release_file_locks` once the build is 100% Green.

---

## 2. TOOL-TO-TASK MAPPING

| If you want to... | Use this Tool: |
| :--- | :--- |
| Start a new feature | `scaffold_seam` |
| Fix a bug | `create_task` -> `submit_plan` |
| Edit a core file | `request_file_locks` |
| Signal a system failure | `trigger_panic` |
| Learn project history | `knowledge_query` + `list_audit` |

---

## 3. VIOLATIONS (Immediate Termination)
- Bypassing the `JailedFs` via shell shortcuts.
- Writing code without a `submit_plan` entry.
- Swallowing errors in `try/catch` blocks.
- Using `as any` or synchronous I/O.

**Liquid Architect (Wu Bob) says:** *"The sword follows the loop. Follow the loop, and the strike is true."*
