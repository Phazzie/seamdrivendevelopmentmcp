# CHAMBER_HARDENING_MAP.md - The Liquid Sword Roadmap

This map documents every "Chamber" (Seam) in the system and the structural hardening required to meet the **Senior Engineer Mandate**.

## Phase 1: The Core Foundation (High Difficulty)

### 1. Seam: Store (`src/lib/adapters/store.adapter.ts`)
**Difficulty:** 10/10 (The Heart)

**Execution Checklist:**
- [ ] **Step 1.1 (Contract):** Modify `contracts/store.contract.ts`. Change `load()`, `save()`, and `update()` to return `Promise<T>`.
- [ ] **Step 1.2 (Adapter Core):** Replace `fs.readFileSync` with `await fs.promises.readFile`.
- [ ] **Step 1.3 (Adapter Atomicity):** Replace `fs.writeFileSync` and `fs.renameSync` with `await` counterparts.
- [ ] **Step 1.4 (Adapter Fsync):** Replace `fs.openSync` and `fs.fsyncSync` with async file handle operations.
- [ ] **Step 1.5 (Mock):** Update `src/lib/mocks/store.mock.ts` to wrap internal state returns in `Promise.resolve()`.
- [ ] **Step 1.6 (Contract Tests):** Update `tests/contract/store.test.ts` and `store_real.test.ts` to `await` all store calls.
- [ ] **Step 1.7 (Locker Cascade):** Update `LockerAdapter` calls: `await this.store.load()`, `await this.store.update()`.
- [ ] **Step 1.8 (Tasks Cascade):** Update `TaskAdapter` calls: `await this.store.load()`, `await this.store.update()`.
- [ ] **Step 1.9 (Messages Cascade):** Update `MessageAdapter` calls: `await this.store.load()`, `await this.store.update()`.
- [ ] **Step 1.10 (Agents Cascade):** Update `AgentAdapter` calls: `await this.store.load()`, `await this.store.update()`.
- [ ] **Step 1.11 (Intelligence Cascade):** Update `KnowledgeAdapter`, `AdrAdapter`, and `IdeaAdapter`.
- [ ] **Step 1.12 (Server Wiring):** Update `src/index.ts` to handle async initialization if needed.

### 2. Seam: Locker (`src/lib/adapters/locker.adapter.ts`)
**Difficulty:** 8/10 (The Shield)

**Execution Checklist:**
- [ ] **Step 2.1 (Injection):** Add `projectRoot: string` to constructor.
- [ ] **Step 2.2 (Enforcement):** In `acquire()`, query `store.load()` for pending `review_gates`.
- [ ] **Step 2.3 (Logic):** Return `LOCKED_PENDING_APPROVAL` error if a gate exists for the agent.
- [ ] **Step 2.4 (Path):** Remove `process.cwd()` from `NORMALIZATION_FIXTURE` resolution.

## Phase 2: Management & Intelligence (Medium Difficulty)

### 3. Seam: Tasks (`src/lib/adapters/tasks.adapter.ts`)
- [ ] **Step 3.1 (Path Injection):** Refactor mocks to accept fixture paths from the constructor.
- [ ] **Step 3.2 (Sorting):** Implement `.sort((a, b) => b.updated_at - a.updated_at)` in `list()`.

### 4. Seam: Knowledge / ADR / Ideas
- [ ] **Step 4.1 (Sync Purge):** Grep and replace any residual `Sync` calls missed in Phase 1.
- [ ] **Step 4.2 (Mock DI):** Inject paths into `MockKnowledge`, `MockAdr`, `MockIdeas`.

## Phase 3: The Origin & Meta-Tools (Lower Difficulty)

### 5. Seam: Scaffolder (`src/lib/adapters/scaffolder.adapter.ts`)
- [ ] **Step 5.1 (Templates):** Update `renderProbe` to use `import.meta.url` instead of hardcoded `process.cwd()`.
- [ ] **Step 5.2 (Templates):** Update `renderMock` to require `fixturePath` injection.
- [ ] **Step 5.3 (Templates):** Update `renderAdapter` to use `Promise` based Store calls by default.

### 6. Seam: TUI Refresh (`src/tui/ui/cockpit.ts`)
- [ ] **Step 6.1 (Long-Polling):** Remove `setInterval`. Implement `refreshLoop()`.
- [ ] **Step 6.2 (Mutex):** Add `isRendering` boolean guard to `screen.render()`.

## Phase 4: Verification (Final Purge)

### 7. Global Mandate Linter (`scripts/verify-mandates.ts`)
- [ ] **Step 7.1 (Script):** Create linter using `ripgrep` or `grep` to detect `any` and `process.cwd()`.
- [ ] **Step 7.2 (Integration):** Update `package.json` -> `"test": "node dist/scripts/verify-mandates.js && ..."`