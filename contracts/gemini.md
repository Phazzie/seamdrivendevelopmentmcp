# GEMINI.md: The Law of Contracts (contracts/)

## 🚨 PRIME DIRECTIVE: THE SCHEMA IS THE SWORD
You are forbidden from writing implementation code until the Contract defines the **Type**, the **Value**, and the **Failure**. A Contract without a Zod Schema is just a suggestion. Suggestions kill projects.

---

## 1. THE SUPREME LAWS (Mechanical Enforcement)

### Law 1: Zod Sovereignty
- **MANDATORY:** Every interface must have a matching `z.object()` schema.
- **FORBIDDEN:** `interface Foo { id: string }` without `export const FooSchema = z.object(...)`.
- **WHY:** The runtime cannot enforce TypeScript interfaces. The runtime enforces Zod.

### Law 2: The Error Enum
- **MANDATORY:** You must define failure modes as specific strings (e.g., `"LOCKED" | "STALE_REVISION"`).
- **FORBIDDEN:** Generic `string` or `any` for error codes.
- **VIOLATION:** The Linter will not catch this, but the **Haters Tribunal** will reject your PR.

---

## 2. THE SHADOW STATE (Invisible Rules)
- **Schema Bleed:** Do not import Zod schemas from one contract into another unless there is a strict dependency (e.g., `AppError` is allowed globally).
- **The "Optional" Trap:** `z.optional()` means "undefined is okay." `z.nullable()` means "null is okay." Do not confuse them. We prefer `optional()` for fields that might be missing from legacy data.

---

## 3. ISLAND INVENTORY (No Dependencies)
- **Allowed:** `zod`.
- **Banned:** `fs`, `path`, `crypto`. Contracts are pure logic. They must run in the browser (Web HUD) and the server (Node) without modification.

---

## 4. THE "HELPFUL ASSISTANT" TRAP (Don't Do It)
- **The Shortcut:** "I'll just add a field to the interface and update the schema later."
- **The Punishment:** You have now created a "Ghost Field" that exists in Type-space but will be stripped by `z.parse()` at runtime. You have broken the data bridge.

## 🚨 FINAL RECAP
1. **Did you export the Schema?**
2. **Did you use `z.infer`?**
3. **Is this file zero-dependency (except Zod)?**
