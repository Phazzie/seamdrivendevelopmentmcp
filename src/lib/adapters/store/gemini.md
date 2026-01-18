# GEMINI.md: The Heart (src/lib/adapters/store/)

## 🚨 PRIME DIRECTIVE: THE PULSE MUST NOT SKIP
This folder manages the **Single Source of Truth**. If this code fails, the agents lose their memory. We prioritize **Durability** over **Throughput**.

---

## 1. THE SUPREME LAWS (Mechanical Enforcement)

### Law 1: The Atomic Handshake
- **MANDATORY:** All writes must follow the sequence: `Write Temp` -> `fsync` -> `Rename`.
- **FORBIDDEN:** Direct `fs.writeFile` to the target path.
- **WHY:** If the power cuts during a direct write, the JSON is corrupted (0 bytes). With atomic rename, the file is either Old or New, never Broken.

### Law 2: The Revision Pulse
- **MANDATORY:** Every write must increment `revision`.
- **MANDATORY:** Every `waitForRevision` call must have a timeout.
- **VIOLATION:** An infinite wait leaks listeners and halts the TUI.

---

## 2. THE SHADOW STATE (The Atomic Limbo)
- **The Danger Zone:** Between `handle.sync()` and `fs.rename`, the file is on disk but not "visible."
- **The Invariant:** Do not attempt to read the file during this window. Rely on the in-memory `current` state passed to the updater function.

---

## 3. ISLAND INVENTORY
- **Allowed:** `fs/promises`, `path`, `crypto`, `events`, `zod` (via contract).
- **Banned:** `sqlite`, `leveldb`. We are building a "Hexagonal Wheel." Do not import a database engine.

---

## 4. THE "HELPFUL ASSISTANT" TRAP
- **The Shortcut:** "I'll just use `fs.writeFileSync` for the tests to make them faster."
- **The Punishment:** You have introduced a race condition that will flake 1% of the time. The **Pragmatist** will hunt you down.

## 🚨 FINAL RECAP
1. **Did you use `handle.sync()`?**
2. **Did you increment the revision?**
3. **Did you use `PathGuard` to jail the path?**
