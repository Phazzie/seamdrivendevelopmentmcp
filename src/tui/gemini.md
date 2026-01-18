# GEMINI.md: The HUD (src/tui/)

## 🚨 PRIME DIRECTIVE: PASSIVE OBSERVATION
The TUI is a **Monitor**, not a **Console**. It watches the pulse; it does not alter the heartbeat.

---

## 1. THE SUPREME LAWS (Mechanical Enforcement)

### Law 1: The Read-Only Vow
- **MANDATORY:** The TUI may only call `list()` or `get()` methods on Adapters.
- **FORBIDDEN:** Calling `create()`, `update()`, or `execute()`.
- **WHY:** We moved interaction to the Web HUD. The TUI is a legacy viewer.

### Law 2: The Pulse Drive
- **MANDATORY:** UI updates must be triggered by `revisionStream`.
- **FORBIDDEN:** `setInterval` polling or `while(true)` loops without a wait.
- **VIOLATION:** The **Hawk** will flag this as CPU waste.

---

## 2. THE SHADOW STATE (Render Flicker)
- **The Scratch:** `blessed` renders are expensive.
- **The Invariant:** Only call `screen.render()` if the ViewModel has actually changed (hash check or revision check).

---

## 3. ISLAND INVENTORY
- **Allowed:** `blessed`, Adapter interfaces.
- **Banned:** Complex state management libraries. Use the `deriveViewModel` pure function pattern.

---

## 4. THE "HELPFUL ASSISTANT" TRAP
- **The Shortcut:** "I'll just re-add the textbox so I can send a test message."
- **The Punishment:** You have reintroduced the "Fossil." The TUI is dead; long live the Web HUD.

## 🚨 FINAL RECAP
1. **Is it Read-Only?**
2. **Is it Event-Driven?**
3. **Did you remove the input handling?**
