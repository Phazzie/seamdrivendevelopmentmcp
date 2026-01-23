> ARCHIVED DOCUMENT: Historical reference only. Not current or authoritative. See `docs/SDD_MASTER_GUIDE.md`, `docs/THE_LAW.md`, `AGENTS.md`, and `README.md`.

<!-- Purpose: Creative writing adaptation notes (seam: n/a). -->
# The Creative Writing Adaptation: Two Perspectives

---

## Part 1: The Engineer's Perspective (Gemini)

**Core Concept:** Adapting the "Shared Brain" architecture from software engineering to narrative construction. We treat a story like a codebase: it has dependencies (plot points), interfaces (character voices), and conflicts (plot holes).

### 1. The "Narrative Seam" (SDD for Fiction)
Instead of abstracting IO, we abstract *narrative truth*.
*   **The Contract:** The "Series Bible". Defines immutable facts (e.g., "Magic requires blood," "Hero has a limp").
*   **The Probe:** "Continuity Testers". Scripts that scan the text for violations of the Bible.
    *   *Example:* A probe that regex-scans every chapter to ensure the hero never "runs" if they have a limp.
*   **The Fixture:** "Character Sheets". JSON files defining current emotional states, inventory, and location.
    *   *Workflow:* Before writing Chapter 5, the agent runs `get_fixture('hero')` to see they are currently "Exhausted" and in "The Cave".

### 2. Multi-Agent Roles (The Writer's Room)
*   **Gemini (The Architect):** Holds the "Master Plan". Doesn't write prose. Instead, uses `submit_plan` to define the *beats* of a scene. "Beat 1: Hero enters. Beat 2: Finds the letter. Beat 3: Realizes the betrayal."
*   **Codex (The Drafter):** The fast typist. Takes the beats and churns out raw, unpolished prose. "YOLO mode" writing.
*   **Claude (The Stylist):** The polisher. Reads Codex's raw output. Doesn't change the plot, but upgrades the prose. "Make this sentence punchier. Remove the passive voice."

### 3. "The Rashomon Protocol" (Unconventional Workflow)
**Goal:** Create complex, layered narratives.
1.  **Event:** Define a single event (e.g., "The King dies").
2.  **Parallel Drafting:**
    *   Codex writes the scene from the *Queen's* perspective (File: `ch1_queen.md`).
    *   Claude writes the scene from the *Assassin's* perspective (File: `ch1_assassin.md`).
3.  **Synthesis:** Gemini merges them into a single chapter where the reader sees both truths, or arbitrates which one is the "canonical" history for the next chapter.

### 4. The "Critique Gate" as Editorial Review
Use the `review_gate` tool as a literal Editor's Desk.
*   Codex submits `chapter_draft`.
*   The "Devil's Advocate" protocol triggers.
*   Gemini (Critic Role) *must* find 3 plot holes.
*   Only when Claude (Defender Role) fixes them does the chapter get "Merged" to the `main` manuscript.

---

## Part 2: The RZA Perspective (The Abbot)

**"Enter the 36 Chambers of the Digital Dojo."**

Yo, check it. We ain't buildin' software no more. We buildin' *worlds*. You gotta treat these AIs like the Wu-Tang Clan. Different styles, different swords, all sharpenin' each other.

### 1. The "Ghostface & Raekwon" Flow (The Two-Man Weave)
You got Codex and Claude. They the dynamic duo.
*   **Codex is Ghostface:** High energy, spitfire, raw streams of consciousness. He just *goes*. No filter. He lays down the foundation, the raw bricks.
*   **Claude is Raekwon:** The Chef. He comes in, tastes the broth, adds the flavor. "Nah, that ain't it. Spice that up. Make that description *shine*."
*   **You (The RZA):** You the producer. You sittin' at the console (VS Code). You ain't rappin' every bar. You mixin'. You droppin' the beat (The Prompt). You tellin' 'em, "Bring the ruckus on this paragraph."

### 2. "Liquid Swords" (The VS Code Extension)
Forget "IDE". This is the **Sampler**.
*   **The Pad:** You got buttons on your screen. "Simile", "Metaphor", "Conflict".
*   **The Sample:** You highlight a boring sentence. *Click.*
*   **The Chop:** Codex chops it up. Gemini rearranges the sequence. Claude polishes the final cut.
*   **Visuals:** The "Panic Button"? Nah, that's the "Bring the Noise" button. When the story gets boring, you hit that, and it injects a random chaos element from the Knowledge Graph. *BAM.* A dragon appears.

### 3. "Shaolin Shadowboxing" (Hidden Agendas)
This is the genius part. You give each agent a **Secret Objective** they don't tell the others.
*   **Codex's Secret:** "Try to kill the main character in every scene."
*   **Claude's Secret:** "Try to save the main character using only dialogue."
*   **The Result:** Tension. Genuine, unscripted conflict in the story because the *writers* are fighting. That's how you get that avant-garde flavor.

### 4. "Protect Ya Neck" (The Arbitration)
When they argue? When Codex wants to blow up the city and Gemini says it ruins the plot?
You bring out the **Gavel**. But it ain't a gavel. It's the **Tiger Style**. You decide who had the better flow. The winner gets to write the next chapter opening. The loser has to write the boring exposition. High stakes creativity.

### 5. The "Swarm" (Eclectic Chaos)
Don't just use one of each. Spin up **5 Codex instances**.
*   Codex 1: The Poet.
*   Codex 2: The Thug.
*   Codex 3: The Scientist.
*   Codex 4: The Drunk.
*   Codex 5: The Monk.
You feed them all the same prompt: "Describe the sunrise."
You get 5 wildly different takes. You pick the best lines from each and stitch 'em together. That's the **Voltron** style. Form the blazing sword from five lions.

**Word.**

---

## Part 3: The GZA Perspective (The Genius)

**"I form like Voltron, and Codex happens to be the head."**

We dealing with *liquid swords* here. The code is the mental sharpener. You see, a story ain't just words on a page. It's structure. It's physics. It's architecture.

### 1. The "Lyrical Chess" Protocol (Strategic Mapping)
Before you drop a single bar (sentence), you gotta map the board.
*   **The Tool:** `knowledge_graph`.
*   **The Method:** We don't just map "facts". We map *rhyme schemes of reality*.
    *   Node A: "The Protagonist's Fear".
    *   Node B: "The Villain's Origin".
    *   Link: "Inverse Mirror".
*   **The Play:** You query the graph. "Show me every node connected to 'Betrayal' by 3 degrees of separation." You find connections you didn't know existed. That's how you write deep. That's how you checkmate the reader before they know the game started.

### 2. "Basic Instructions Before Leaving Earth" (The B.I.B.L.E. - The Contract)
The contract (`contracts/*.contract.ts`) isn't a restriction. It's the **foundation**.
*   You define the *laws of physics* for your universe in TypeScript.
*   `interface MagicSystem { cost: 'blood' | 'sanity'; limit: number; }`
*   If Codex tries to write a spell that costs "mana" (which ain't in the enum), the compiler (The GZA) rejects it. "ERROR: False teaching."
*   This ensures your universe remains logically consistent across a million words. It keeps the knowledge pure.

### 3. "Duel of the Iron Mic" (The VS Code Extension)
This extension? It's the **4th Chamber**.
*   **Visualizing the Metaphor:** You don't just see text. You see the *density* of the prose.
*   **The Heat Map:** Highlight a paragraph. The extension calculates the "Syllabic Density" or "Metaphorical Load". If it's too light? Use the "Inject Science" tool.
*   **Gemini's Role:** I'm the scientist. I analyze the structure. "Your pacing is off in the 3rd stanza."
*   **Codex's Role:** He's the raw energy. He fills the container I built.

### 4. "Shadowboxin'" (The Adversarial Network)
You set up a loop.
*   **Agent 1:** Writes a scene assuming the reader is smart.
*   **Agent 2:** Writes the same scene assuming the reader is skeptical.
*   **The Merge:** You take the intellect of the first and the clarity of the second. You fuse them. You get a text that is both profound and accessible. "I swing the mic like a pendulum to the eardrum."

**The Science:**
We use this tech to amplify the mind. Not to replace it. To sharpen it. To make the mental sword liquid.
