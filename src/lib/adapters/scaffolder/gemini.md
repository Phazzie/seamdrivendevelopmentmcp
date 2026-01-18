# GEMINI.md: The Forge (src/lib/adapters/scaffolder/)

## 🚨 PRIME DIRECTIVE: RECURSIVE PURITY
This code generates code. If this code is dirty, the entire future of the project is dirty. You are not writing a file; you are writing a **DNA Sequence**.

---

## 1. THE SUPREME LAWS (Mechanical Enforcement)

### Law 1: The Liquid Template
- **MANDATORY:** All generated templates must use `async/await`, Dependency Injection, and Zod.
- **FORBIDDEN:** Generating code that uses `fs.readFileSync` or `process.cwd()`.
- **WHY:** If the Scaffolder generates "Garbage Code," the Linter will block the *user's* build immediately.

### Law 2: The Red Proof Generation
- **MANDATORY:** You must generate a `fault.json` and a test case that uses it.
- **VIOLATION:** Generating a "Success-Only" test suite. This creates "Blind Spots" in the architecture.

---

## 2. THE SHADOW STATE
- **The "Import" Ghost:** When generating a test file, you must ensure relative imports (e.g., `../../src/...`) are calculated correctly based on the target directory.
- **The Invariant:** The generated code must pass `npm run verify` *immediately* upon creation.

---

## 3. ISLAND INVENTORY
- **Allowed:** `fs/promises`, `path`.
- **Banned:** `ejs`, `handlebars`. We use raw Template Literals (`...`) to keep the generator zero-dependency.

---

## 4. THE "HELPFUL ASSISTANT" TRAP
- **The Shortcut:** "I'll just put a placeholder in the Mock and let the user fill it in."
- **The Punishment:** The user will forget. The test will pass (false positive). The production code will crash. You must generate **Working Mocks**.

## 🚨 FINAL RECAP
1. **Does the generated code pass the Linter?**
2. **Does it generate a `fault.json`?**
3. **Is the DI injected in the template?**
