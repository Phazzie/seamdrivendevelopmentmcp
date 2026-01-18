# GEMINI.md: The Registry (src/lib/providers/)

## 🚨 PRIME DIRECTIVE: TRAFFIC CONTROL ONLY
Providers are **Routers**, not **Workers**. They accept a request, validate the schema, call the Adapter, and return the result. They do not "think."

---

## 1. THE SUPREME LAWS (Mechanical Enforcement)

### Law 1: The Logic Ban
- **MANDATORY:** All business logic (locks, persistence, filtering) belongs in the **Adapter**.
- **FORBIDDEN:** `if (task.status === 'done') ...` inside a Provider.
- **WHY:** If you put logic here, it is untestable by the Contract Tests.

### Law 2: The Zod Gate
- **MANDATORY:** Every tool argument must be parsed via `z.object(...).parse(args)`.
- **VIOLATION:** Passing raw `args` to an adapter. This allows "Type Poisoning."

---

## 2. THE SHADOW STATE (Error Masking)
- **The Swallow:** Providers often try to catch Adapter errors to format them.
- **The Invariant:** Do not catch errors here. Let them bubble up to the `ToolExecutor`, which handles the structured error reporting (JSON-RPC).

---

## 3. ISLAND INVENTORY
- **Allowed:** `zod`, `ToolRegistry` types, Adapter interfaces.
- **Banned:** `fs`, `path`, `process`. Providers are environment-agnostic.

---

## 4. THE "HELPFUL ASSISTANT" TRAP
- **The Shortcut:** "I'll just add a quick check here to see if the file exists."
- **The Punishment:** You have bypassed the `PathGuard` in the Adapter. You have created a security hole.

## 🚨 FINAL RECAP
1. **Did you keep the logic in the Adapter?**
2. **Did you validate inputs with Zod?**
3. **Did you let errors bubble up?**
