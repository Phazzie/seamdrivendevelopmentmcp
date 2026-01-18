# GEMINI.md: The Circuitry (src/lib/helpers/)

## 🚨 PRIME DIRECTIVE: ZERO-DEPENDENCY PURITY
This folder is the "nervous system." It connects the muscles (Adapters) to the brain (Providers). It must be lighter than air.

---

## 1. THE SUPREME LAWS (Mechanical Enforcement)

### Law 1: Zero External Imports
- **MANDATORY:** You may only import standard Node modules (`fs`, `path`, `crypto`, `events`) and internal Contracts.
- **FORBIDDEN:** Importing `StoreAdapter` or any specific Adapter implementation.
- **WHY:** Helpers must be reusable across any context (CLI, Web, TUI). Dependency loops here kill the bootstrap.

### Law 2: The Memory Cap
- **MANDATORY:** `ToolExecutor` and `PathGuard` must handle large inputs gracefully.
- **FORBIDDEN:** `JSON.stringify` on unbounded input without a length check.
- **VIOLATION:** The **Hawk** will reject any helper that risks an OOM (Out of Memory) crash.

---

## 2. THE SHADOW STATE (Symlink Escapes)
- **The Jailbreak:** `path.resolve` is not enough. You must use `fs.realpath` to ensure a Symlink doesn't point outside the Root.
- **The Invariant:** `PathGuard.validate(p)` MUST return an absolute path that starts with `ROOT_DIR`.

---

## 3. ISLAND INVENTORY
- **Allowed:** Node built-ins.
- **Banned:** Everything else.

---

## 4. THE "HELPFUL ASSISTANT" TRAP
- **The Shortcut:** "I'll just import the Store to check a config value."
- **The Punishment:** You have created a circular dependency. The server will fail to boot. Pass the config value in as an argument.

## 🚨 FINAL RECAP
1. **Did you avoid importing Adapters?**
2. **Did you truncate large logs?**
3. **Is the Path Jail airtight?**
