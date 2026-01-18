# GEMINI.md: The Shield (src/lib/adapters/locker/)

## 🚨 PRIME DIRECTIVE: SURGICAL PRECISION
We do not block "Agents"; we block "Files." A blunt lock kills concurrency. A surgical lock enables the swarm.

---

## 1. THE SUPREME LAWS (Mechanical Enforcement)

### Law 1: The Intersection Check
- **MANDATORY:** You must normalize paths using `path.resolve()` before checking against `affectedResources`.
- **FORBIDDEN:** String comparison of raw paths (`./file` !== `/abs/path/file`).
- **WHY:** Agents use relative paths; the Store uses absolute paths. If you don't normalize, the lock fails silently.

### Law 2: The State Gate
- **MANDATORY:** Locks are blocked if *any* pending Review Gate targets the requested resource.
- **FORBIDDEN:** Granting a lock because "the plan looks simple."
- **VIOLATION:** The **Pragmatist** will view this as a security breach.

---

## 2. THE SHADOW STATE (TTL Drift)
- **The Ghost Lock:** A lock expires at `expiresAt`. However, the Store might not process the `release` command instantly.
- **The Invariant:** The source of truth is `expiresAt > Date.now()`. If the time has passed, the lock is dead, even if the record exists.

---

## 3. ISLAND INVENTORY
- **Allowed:** `path`, `crypto`.
- **Banned:** Direct access to `fs`. The Locker talks to the Store, not the disk.

---

## 4. THE "HELPFUL ASSISTANT" TRAP
- **The Shortcut:** "I'll just add a `force` flag to let the admin bypass the lock."
- **The Punishment:** You have created a backdoor that an agent will eventually exploit to overwrite a colleague. Admin overrides must go through `force_release_locks`, not the standard `acquire` method.

## 🚨 FINAL RECAP
1. **Did you normalize the resource path?**
2. **Did you check the Review Gates?**
3. **Is the TTL logic relying on system time (Date.now)?**
