# The Seam-Driven Development (SDD) Master Blueprint

## VOLUME I: THE CLEAN SHAOLIN CHRONICLES (Wu Bob & The GZA)
*A Masterclass in Architectural Flow and the Liquid Sword of Rigor.*

### 1. The Crisis of the Ghost Prototype
Yo, check the motherboard. The world is full of "70% Creators." These are people who step to the AI, drop a rhyme, and get back a glowing UI. It looks fast. It looks like progress. But it's an illusion. The AI has built a "Ghost Prototype"—a body with no bones. 

The "70% Problem" is the wall you hit when the honeymoon is over. You try to plug in the real world—the database that needs async logic, the file system that needs atomic locks, the API that needs strict types—and the system collapses. The AI starts chasing its own tail, hallucinating code because it doesn't know where the boundaries are. The circuitry is crossed. The system shorts.

In the 36 Chambers of Code, we beat this by doing **Integration First**. We don't care how the UI looks if the "Seams" are leaky. We define the Law of the Boundary before we write a single line of logic. We build the steel frame, and then—and only then—do we let the AI inhabit it.

### 2. The Philosophy: SOLID Steel and Liquid Flow
We merge the surgical precision of **Uncle Bob** with the lyrical strategy of **The GZA**.

*   **The Single Responsibility Principle (SRP):** Uncle Bob says a module should have one reason to change. If your Task Board logic is touching the File System directly, you've got "muddiness." The GZA says: "The brain is the motherboard." If the traces are crossed, the signal is lost. We keep our "Chambers" isolated so the AI can focus on one track at a time without catching a virus from the rest of the codebase.
*   **Dependency Inversion:** We don't let our logic be a slave to the environment. If a function finds its own path (`process.cwd()`), it's a tethered slave. We **Inject the Path**. We pass the world *into* the chamber. This makes the code portable, testable, and unbreakable.

### 3. The Arsenal: Our Hardened Weapons
We don't trust "Helpful Advice." We use **Mechanical Enforcement**. We built these tools to be the police of the system.

#### **Weapon 1: The Forge (`scaffold_seam`)**
This is the "Genesis Tool." When you need a new feature, you don't manually create files like a caveman. You run the Forge. It etches a 5-file "Compliance Loop" into the disk:
1.  **The Contract:** The Law. It defines the inputs and outputs using Zod.
2.  **The Probe:** The Radar. A script that samples reality.
3.  **The Mock:** The Mirror. A fake version that returns the samples.
4.  **The Test:** The Proof. Verifies the Mock follows the Law.
5.  **The Adapter:** The Work. The real implementation.
The Forge is **Hardened**. It generates code that is Async by default and requires Dependency Injection. It is impossible to build a "Lazy" feature if you start at the Forge.

#### **Weapon 2: The Radar (`run_probe`)**
We never rhyme over "Fantasy Data." If we need to talk to the Store, we run a Probe. The Radar hits the real disk, captures the real JSON, and pins it to a **Fixture** with a `captured_at` timestamp. If the sample is older than 7 days, the track is "Stale." We refresh the reality before we update the logic.

#### **Weapon 3: The Sheriff (`verify-mandates.ts`)**
This is the "Liquid Sword" of linting. It's a brutal script that scans every line of code.
*   If it sees `as any`, it crashes the build. No lying to the compiler.
*   If it sees `process.cwd()`, it crashes the build. No magic strings.
*   If it sees `Sync` IO in an adapter, it crashes the build. No heart-attacks.
The Sheriff ensures that our "Senior Mandate" isn't just a poem in a Markdown file—it is a physical law of the machine.

#### **Weapon 4: The Heart (`StoreAdapter`)**
The heart of the Shaolin beats in **Async Sovereignty**. We moved from the "Sync" world to the "Promise" world. We use `FileHandle.sync()` to guarantee that every update is physically etched into the hardware before we move the pointer. It’s durable. It’s event-driven. It has a "Pulse" (`waitForRevision`) that tells the system when to wake up.

### 4. The Ritual: The 5 Chambers of Implementation
You must pass through the Chambers in order. No shortcuts.

1.  **Chamber of Law (Contract):** You define the interface. You and the AI now have a "Shared Brain."
2.  **Chamber of Truth (Probe):** You capture real-world data. No more guessing.
3.  **Chamber of Reflection (Mock):** You build a perfect fake. If you can't fake it, you can't build it.
4.  **Chamber of Proof (Test):** You prove the Mock works. This is your "Green Light."
5.  **Chamber of Reality (Adapter):** You write the real code. If it fails, the bug has nowhere to hide because the Test and the Mock have already cleared the path.

---

## VOLUME II: THE PROFESSIONAL ENGINEERING STANDARD
*A Technical Guide to Seam-Driven Development and Lifecycle Management.*

### 1. Introduction: The Integration-First Paradigm
Seam-Driven Development (SDD) is a formal architectural methodology designed to mitigate the risks of AI-assisted software construction. In traditional development, "Implementation" often precedes "Integration," leading to late-stage discovery of structural mismatches. SDD reverses this, forcing the definition and validation of **Boundaries (Seams)** as the first step of any feature lifecycle.

### 2. Solving the "70% Problem"
AI agents excel at local logic but struggle with systemic integration. The "70% Problem" describes the plateau where an application is visually complete but structurally unsound. SDD solves this by:
*   **Eliminating Hallucinations:** Grounding AI in JSON Fixtures rather than imagined data structures.
*   **Isolating Failures:** By using identical tests for Mocks and Adapters, bugs are immediately localized to either the "Plan" (Contract) or the "Execution" (Adapter).
*   **Enforcing Purity:** Using automated mandate verification to prevent the accumulation of "Agentic Debt" (shortcuts the AI takes to achieve a successful-looking result).

### 3. The Toolchain: Mechanics and Usage

#### **3.1 Scaffolder (`npm run scaffold`)**
The Scaffolder is a spec-driven code generator. It accepts a `ScaffoldSpec` (defined in Zod) and produces a complete Seam.
*   **Dependency Injection (DI):** Every generated class requires its external paths (e.g., `fixturePath`, `rootDir`) to be passed into the constructor.
*   **Async Interface:** Every method is generated as an `async` function, enforcing a non-blocking event loop across the entire server.

#### **3.2 Probe Runner (`npm run probes`)**
Probes are transient TypeScript modules located in `/probes`. They are the "Research Phase" of development.
*   **Verification:** Probes are used to verify environment assumptions (e.g., "Does the OS support atomic renames?").
*   **Fixture Generation:** Probes serialize real-world state into `/fixtures`. This data becomes the "Source of Truth" for all Mocks.

#### **3.3 Mandate Linter (`npm run verify`)**
This tool performs static analysis on the source code to ensure compliance with the **Senior Engineer Mandate**. It checks for:
*   **Global Variables:** Any usage of `process` or `__dirname` inside the `src/lib/adapters` layer.
*   **Synchronous Blockage:** Detection of `fs.*Sync` methods which would degrade server performance.
*   **Type Erasure:** Usage of the `any` type, which bypasses the compiler's safety checks.

#### **3.4 Durable Store (`IStore`)**
The persistence layer is implemented using Optimistic Concurrency Control (OCC).
*   **Atomicity:** Updates are written to temporary files, synchronized to the hardware using `handle.sync()`, and then moved into place via an atomic `rename`.
*   **The Pulse:** Clients utilize `waitForRevision(since, timeout)` to implement efficient long-polling. This ensures the UI only updates when the underlying data has changed, significantly reducing CPU and I/O overhead.

### 4. The 5-Step SDD Lifecycle

1.  **Contract Definition:** Define the data shape in `contracts/`. This is the "Shared Brain" between the Human Architect and the AI Contributor.
2.  **Reality Capture:** Execute a Probe to generate a Fixture. This grounds the development in factual data.
3.  **Mock Implementation:** Create a class in `src/lib/mocks/` that implements the contract using only the Fixture data. 
4.  **Contract Verification:** Create a test in `tests/contract/`. The test must pass against the Mock. This validates that the Contract is sufficient to handle the required data.
5.  **Adapter Implementation:** Create the "Real" version in `src/lib/adapters/`. Run the same contract test. Because the interface and data flow are already proven, implementation becomes a focused, low-risk task.

### 5. Lessons from the "Liquid Hardening" (Jan 2026)
During the mid-stage of the project, we identified a critical accumulation of technical debt. We performed a "Liquid Purge" to restore architectural integrity. Key takeaways:
*   **Manual Docs are Insufficient:** You cannot "ask" an AI to be professional. You must use **Mechanical Constraints**. The Mandate Linter was the turning point for project stability.
*   **The Heartbeat is Sovereign:** Synchronous code is a debt that compounds. Moving the entire Store to an asynchronous model was the single greatest performance win.
*   **Portability requires DI:** Removing `process.cwd()` allowed our tests to run in any environment without side effects, enabling a cleaner and faster development loop.
