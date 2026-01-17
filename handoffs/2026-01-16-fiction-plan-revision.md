# HANDOFF: Fiction Writing Server - Critical Architecture Review & Revision

**Date:** 2026-01-16
**From:** Claude Code (Architecture Review Session)
**To:** Future implementers (Claude, Gemini, Codex, User)
**Status:** Plan Revised - Ready for Phase 0 Implementation
**Context:** Reviewed original plan at `/Users/hbpheonix/.claude/plans/cozy-crunching-pillow.md`, identified critical flaws, proposed architectural fixes

---

## 🎯 Executive Summary

**Original Plan Status:** NEEDS MAJOR REVISION before implementation

**Core Problem Identified:** Plan attempts to store large content (novels) in MCP store.json, which will cause:
- Performance collapse at 100+ chapters
- Data corruption from referential integrity issues
- OCC thrashing with multi-AI coordination
- Maintenance nightmare

**Solution:** Separate content storage from coordination layer. MCP server becomes the "smart index" not the "file cabinet."

**Action Required:** Implement Phase 0 (architectural fixes) BEFORE starting Phase 1 from original plan.

---

## 📋 What We Reviewed

### Original Plan (cozy-crunching-pillow.md)
- 8 seams: chapters → reader_simulation
- 5 phases over 6-8 weeks
- MCP server as unified storage for everything
- Multi-AI coordination patterns
- SDD-compliant implementation

### Review Approach
- "Angry senior dev" code review methodology
- Identified edge cases, failure modes, architectural flaws
- Proposed concrete fixes
- Discussed prose quality tools (missing from original plan)
- Evaluated database options

---

## 🔥 Critical Flaws Found in Original Plan

### 1. **BLOCKER: Content Storage Strategy**

**Problem:**
```typescript
// Original plan stores everything in store.json
store.chapters = [
  { id: "1", content: "5000 words of chapter text...", ... },
  { id: "2", content: "7000 words of chapter text...", ... }
]
// Result: 3MB+ JSON file loaded into memory on every operation
```

**Impact:**
- 100-chapter novel = several MB of JSON
- Every trope tag triggers full store load/parse/serialize
- OCC retries with multi-MB payloads
- Performance degrades exponentially with content size

**Why this kills multi-AI coordination:**
- Claude reads store (revision 100, 3MB)
- Gemini reads store (revision 100, 3MB)
- Claude writes small change → revision 101
- Gemini writes → STALE_REVISION → retry with 3MB payload
- High contention operations = livelock

**Fix Required:** See "Architectural Fixes" section below.

---

### 2. **BLOCKER: No Referential Integrity**

**Problem:**
```typescript
Foreshadow {
  planted_in_chapter_id: string  // No validation
  points_to_reveal_id: string | null  // Could point to nothing
}
```

**Attack Surface:**
- Delete Chapter 5 → 20 foreshadows become orphaned
- Typo in chapter_id → silent failure
- Circular references → infinite loops
- No cascade delete strategy
- No foreign key constraints

**Edge Cases Missed:**
- User deletes chapter with dependencies → What happens?
- User reorders chapters → Do IDs stay stable?
- User merges two chapters → How migrate references?
- User splits a chapter → Which half gets the annotations?

**Fix Required:** Reference validation layer (see below).

---

### 3. **HIGH PRIORITY: String-Based Character References**

**Problem:**
```typescript
pov_character: string | null  // "Jon Snow" or "Jon" or "john"?
characters_unaware: string[]  // Typo hell
```

**Real-World Failure:**
- Author types "Jon Snow" in Ch 1
- Types "John Snow" in Ch 50
- Query "character knowledge for Jon Snow" → misses half the data
- Debugging takes hours

**Fix Required:** Character registry with canonical IDs.

---

### 4. **HIGH PRIORITY: No Version History**

Fiction writing is iterative revision. Authors need:
- Undo/redo
- "Show me Chapter 5 from last Tuesday"
- "Compare draft 1 vs draft 3"
- "Restore scene AI accidentally deleted"

**Original plan has NONE of this.**

One bad AI edit = permanent data loss.

**Fix Options:**
- Immutable event log
- Snapshot system
- Git-like version control
- Or accept data loss as limitation

---

### 5. **MEDIUM: No Pagination**

```typescript
list(filter?: ChapterFilter): Promise<Chapter[]>  // Returns ALL
```

**Problem with:**
- 500-chapter epic fantasy?
- 1000 trope instances?
- Query "all foreshadowing" → 2000 items?

**Fix Required:** Add pagination (limit/offset or cursor-based).

---

### 6. **MEDIUM: Word Count Denormalization**

```typescript
Chapter {
  content: string
  word_count: number  // Derived data stored as source
}
```

**This WILL get out of sync:**
- Direct JSON edits
- Import scripts
- Manual overrides

**Rule:** Never store derived data. Calculate on demand.

---

### 7. **MEDIUM: Status Enum Too Rigid**

```typescript
status: "outline" | "draft" | "revision" | "final" | "published"
```

**Real workflows need:**
- "First draft" / "Second draft"
- "Alpha reader feedback"
- "Beta reader feedback"
- "Editor pass 1" / "Editor pass 2"
- "Proofread" / "Layout"

**Fix Options:**
- User-defined status values
- Flexible tagging system
- Or accept rigid workflow

---

### 8. **LOW: Missing Location/Timeline Tracking**

Original plan tracks:
- ✅ Characters, tropes, emotional arcs
- ❌ WHERE scenes take place
- ❌ WHEN scenes take place (timeline consistency)
- ❌ Travel time validation
- ❌ Day/night cycle, seasons, weather

Authors frequently need: "Wait, how did Character A get from City X to City Y in 2 hours?"

**Decision:** Defer to Phase 6+ or accept as out-of-scope.

---

### 9. **AI Seams: Implementation Details Missing**

Original plan says:
```
AI Strategy: Use simple prompts: "Rate this opening 1-10"
```

**Missing details:**
- Which Claude API endpoint?
- Rate limits handling?
- Cost model? (200 chapters = how many API calls?)
- API downtime handling?
- Prompt versioning? (GPT-4 vs Claude 3.5 vs future models)
- A/B test prompts?
- Where do API keys live?
- How to mock AI in tests?

**Fix Required:** Proper AI adapter implementation (see below).

---

### 10. **AI Fixtures: Non-Deterministic Problem**

Original plan:
```
Probe Strategy: Run real AI analysis, capture results in fixture
```

**Problems:**
1. AI responses are non-deterministic (same input → different output)
2. What's the assertion? "AI rated 7/10" → next run rates 8/10 → test fails?
3. Fixtures capture one AI's opinion → model upgrades invalidate all fixtures

**You can't unit test AI opinions like CRUD operations.**

**Fix Required:** Test caching behavior, not AI quality (see below).

---

## ✅ Architectural Fixes (MUST IMPLEMENT)

### Fix #1: Separate Content from Coordination

**The Core Principle:**
> MCP server = coordination layer, not storage layer

**New Architecture:**

```
┌─────────────────────────────────────────┐
│  Layer 1: Content Storage (Filesystem)  │
│  ├── chapters/ch1.md                    │
│  ├── chapters/ch2.md                    │
│  └── outlines/arc1.md                   │
└─────────────────────────────────────────┘
              ↕
┌─────────────────────────────────────────┐
│  Layer 2: MCP Store (Coordination)      │
│  ├── Chapter metadata + refs            │
│  ├── Foreshadowing graph                │
│  ├── Knowledge tracking                 │
│  ├── Trope registry                     │
│  └── Analysis cache                     │
└─────────────────────────────────────────┘
              ↕
┌─────────────────────────────────────────┐
│  Layer 3: AI Agents (via MCP Tools)     │
│  ├── Claude: Draft chapters             │
│  ├── Gemini: Check continuity           │
│  └── Codex: Rate hooks/tension          │
└─────────────────────────────────────────┘
```

**Implementation:**

```typescript
// BAD: Original plan
Chapter {
  id: UUID
  content: string  // ❌ 5KB-10KB inline
  word_count: number
  // ...
}

// GOOD: Revised architecture
Chapter {
  id: UUID
  contentPath: string  // ✅ "chapters/chapter-5.md"
  word_count: number  // Computed from file on read
  // ...
}

// Adapter implementation
class ChaptersAdapter {
  async create(input: CreateChapterInput): Promise<Chapter> {
    const chapter: Chapter = {
      id: uuid(),
      number: input.number,
      title: input.title,
      contentPath: `chapters/chapter-${input.number}.md`,
      status: "draft",
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // Write content to filesystem
    const fullPath = path.join(projectRoot, chapter.contentPath);
    await fs.writeFile(fullPath, input.content);

    // Store only metadata in MCP store
    return runTransaction(async (store) => {
      store.chapters.push(chapter);
      return chapter;
    });
  }

  async getContent(chapterId: string): Promise<string> {
    const chapter = await this.get(chapterId);
    const fullPath = path.join(projectRoot, chapter.contentPath);
    return fs.readFile(fullPath, 'utf-8');
  }

  async updateContent(chapterId: string, newContent: string): Promise<void> {
    const chapter = await this.get(chapterId);
    const fullPath = path.join(projectRoot, chapter.contentPath);
    await fs.writeFile(fullPath, newContent);

    // Update timestamp in store
    return runTransaction(async (store) => {
      const ch = store.chapters.find(c => c.id === chapterId);
      if (ch) ch.updated_at = Date.now();
    });
  }
}
```

**Benefits:**
- ✅ Store stays small (< 100KB even with 500 chapters)
- ✅ Chapter edits don't trigger store rewrites
- ✅ Can use Read/Write tools for chapter content
- ✅ Content lives in filesystem (git-friendly, editor-friendly)
- ✅ No size limits
- ✅ Lazy loading built-in

---

### Fix #2: Project-Scoped Storage

**Problem:** Original plan uses global store for all projects.

**Solution:** One project = one folder

```
~/fiction-projects/
  my-novel/
    .mcp-collab/
      store.json        # Project-specific store
    chapters/
      chapter-1.md
      chapter-2.md
    outlines/
      act-1-outline.md
    cache/              # AI analysis results
      analysis-ch1.json
```

**MCP Tool Addition:**
```typescript
// New tool: Initialize project
mcp__mcp-collab__init_fiction_project({
  projectPath: "/Users/author/my-novel",
  projectName: "My Novel",
  agentId: "..."
})

// Creates directory structure, initializes store.json
```

**Benefits:**
- Multiple novels in progress
- Each project isolated
- Version control per project
- Easy backup (copy folder)
- Easy sharing (zip folder)

---

### Fix #3: Referential Integrity Layer

**Add validation before store writes:**

```typescript
// contracts/validation.contract.ts
export class ReferenceValidator {
  validateChapterExists(chapterId: string, store: Store): void {
    if (!store.chapters.find(ch => ch.id === chapterId)) {
      throw new ValidationError(`Chapter ${chapterId} not found`);
    }
  }

  validateForeshadowReferences(foreshadow: Foreshadow, store: Store): void {
    this.validateChapterExists(foreshadow.planted_in_chapter_id, store);

    if (foreshadow.points_to_reveal_id) {
      // Validate reveal exists
      if (!store.information?.find(i => i.id === foreshadow.points_to_reveal_id)) {
        throw new ValidationError(`Reveal ${foreshadow.points_to_reveal_id} not found`);
      }
    }
  }

  getCascadeDeletes(chapterId: string, store: Store): CascadeReport {
    return {
      foreshadows: store.foreshadows?.filter(
        f => f.planted_in_chapter_id === chapterId
      ) || [],
      setups: store.setups?.filter(
        s => s.chapter_id === chapterId
      ) || [],
      arc_appearances: store.arc_appearances?.filter(
        a => a.chapter_id === chapterId
      ) || [],
      // ... etc
    };
  }
}

// Usage in adapter
async delete(chapterId: string): Promise<void> {
  return runTransaction(async (store) => {
    // 1. Validate chapter exists
    validator.validateChapterExists(chapterId, store);

    // 2. Check cascade impact
    const cascade = validator.getCascadeDeletes(chapterId, store);
    const totalAffected = Object.values(cascade).flat().length;

    if (totalAffected > 0) {
      // Audit log for human review
      await audit.log({
        action: 'delete_chapter_with_dependencies',
        chapterId,
        cascadeCount: totalAffected,
        cascadeDetails: cascade
      });
    }

    // 3. Delete chapter content file
    const chapter = store.chapters.find(ch => ch.id === chapterId);
    if (chapter?.contentPath) {
      await fs.unlink(path.join(projectRoot, chapter.contentPath));
    }

    // 4. Delete from store
    store.chapters = store.chapters.filter(ch => ch.id !== chapterId);

    // 5. Cascade delete (policy-based)
    store.foreshadows = store.foreshadows?.filter(
      f => f.planted_in_chapter_id !== chapterId
    );
    store.setups = store.setups?.filter(
      s => s.chapter_id !== chapterId
    );
    // ... etc
  });
}
```

**Benefits:**
- ✅ No orphaned references
- ✅ Audit trail for destructive operations
- ✅ Validation errors before corruption
- ✅ Cascade delete transparency

---

### Fix #4: Character Registry

**Add proper entity system:**

```typescript
// New seam: characters (Phase 1)
Character {
  id: UUID
  canonical_name: string           // "Jon Snow"
  display_names: string[]          // ["Jon", "Lord Snow", "bastard"]
  aliases: string[]                // ["Aegon Targaryen"]
  description: string
  created_at: timestamp
  updated_at: timestamp
}

// Update other schemas
CharacterKnowledge {
  character_id: string  // ✅ UUID reference (not free text)
  information_id: string
  state: "knows" | "suspects" | "unaware"
  learned_at_chapter_id: string | null
}

DramaticIrony {
  information_id: string
  reader_knows: boolean
  character_ids_unaware: string[]  // ✅ UUID references
  irony_type: "dramatic" | "tragic" | "cosmic"
}

Chapter {
  id: UUID
  pov_character_id: string | null  // ✅ UUID reference
  // ...
}
```

**Adapter provides lookup:**

```typescript
class CharactersAdapter {
  async resolveCharacterName(nameOrId: string): Promise<Character | null> {
    return runTransaction(async (store) => {
      return store.characters?.find(c =>
        c.id === nameOrId ||
        c.canonical_name === nameOrId ||
        c.display_names.includes(nameOrId) ||
        c.aliases.includes(nameOrId)
      ) || null;
    });
  }

  async getCharacterDisplayName(characterId: string): Promise<string> {
    const char = await this.get(characterId);
    return char.canonical_name;
  }
}
```

**Benefits:**
- ✅ No typos
- ✅ Canonical names
- ✅ Alias support ("Arya" / "No One")
- ✅ Consistent queries

---

### Fix #5: AI Seam Implementation Strategy

**Key Principle:** Treat AI analysis as a cache, not a database.

```typescript
// chapter_analysis.adapter.ts
class ChapterAnalysisAdapter {
  private llmClient: AnthropicClient;

  async analyzeHook(
    chapterId: string,
    hookType: 'opening' | 'ending'
  ): Promise<HookAnalysis> {
    // 1. Check cache first
    const cached = await this.getCachedAnalysis(chapterId, hookType);
    if (cached && !this.isStale(cached, chapterId)) {
      return cached;
    }

    // 2. Run fresh analysis
    const chapter = await chaptersAdapter.get(chapterId);
    const content = await chaptersAdapter.getContent(chapterId);

    const excerpt = hookType === 'opening'
      ? content.slice(0, 1000)  // First 1000 chars
      : content.slice(-1000);   // Last 1000 chars

    const prompt = this.buildHookAnalysisPrompt(excerpt, hookType);

    try {
      const response = await this.llmClient.analyze(prompt, {
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 500,
        temperature: 0.7
      });

      const analysis: HookAnalysis = {
        id: uuid(),
        chapter_id: chapterId,
        hook_type: hookType,
        strength: response.rating,
        hook_category: response.category,
        analysis: response.analysis,
        suggestions: response.suggestions,
        analyzed_at: Date.now(),
        analyzer_agent: 'Claude',
        analyzer_model: 'claude-3-5-sonnet-20241022',
        chapter_updated_at: chapter.updated_at
      };

      // 3. Cache result
      return runTransaction(async (store) => {
        // Remove old analysis for this chapter+hookType
        store.hook_analyses = store.hook_analyses?.filter(
          a => !(a.chapter_id === chapterId && a.hook_type === hookType)
        ) || [];
        store.hook_analyses.push(analysis);
        return analysis;
      });

    } catch (error) {
      // Handle API errors gracefully
      throw new AIAnalysisError(`Analysis failed: ${error.message}`, {
        chapterId,
        hookType,
        originalError: error
      });
    }
  }

  private isStale(analysis: HookAnalysis, chapterId: string): boolean {
    const chapter = store.chapters.find(ch => ch.id === chapterId);
    return analysis.chapter_updated_at < chapter.updated_at;
  }

  private buildHookAnalysisPrompt(excerpt: string, hookType: string): string {
    return `Analyze this chapter ${hookType} for storytelling effectiveness.

${hookType === 'opening' ? 'Opening' : 'Ending'} text:
"""
${excerpt}
"""

Rate the ${hookType} strength from 1-10 and categorize it.

Respond in JSON:
{
  "rating": <number 1-10>,
  "category": "<action|dialogue|mystery|emotion|cliffhanger|question|revelation>",
  "analysis": "<2-3 sentence analysis>",
  "suggestions": ["<specific improvement>", "<specific improvement>"]
}`;
  }
}
```

**Testing Strategy:**

```typescript
// DON'T test AI quality, test caching behavior
describe('ChapterAnalysisAdapter', () => {
  let adapter: ChapterAnalysisAdapter;
  let mockLLM: MockLLMClient;

  beforeEach(() => {
    mockLLM = new MockLLMClient();
    adapter = new ChapterAnalysisAdapter(mockLLM);
  });

  it('should cache analysis results', async () => {
    const analysis1 = await adapter.analyzeHook('ch1', 'opening');
    const analysis2 = await adapter.analyzeHook('ch1', 'opening');

    expect(analysis1.id).toBe(analysis2.id);
    expect(mockLLM.callCount).toBe(1);  // Only called once
  });

  it('should invalidate cache when chapter updated', async () => {
    const analysis1 = await adapter.analyzeHook('ch1', 'opening');

    await chaptersAdapter.updateContent('ch1', 'new content');

    const analysis2 = await adapter.analyzeHook('ch1', 'opening');
    expect(analysis2.id).not.toBe(analysis1.id);
    expect(mockLLM.callCount).toBe(2);  // Called twice
  });

  it('should handle API errors gracefully', async () => {
    mockLLM.shouldFail = true;

    await expect(
      adapter.analyzeHook('ch1', 'opening')
    ).rejects.toThrow(AIAnalysisError);
  });
});

// Mock LLM client for tests
class MockLLMClient {
  callCount = 0;
  shouldFail = false;

  async analyze(prompt: string, options: any): Promise<AIResponse> {
    this.callCount++;

    if (this.shouldFail) {
      throw new Error('API rate limit exceeded');
    }

    return {
      rating: 7,
      category: 'action',
      analysis: "Strong opening with immediate action hook.",
      suggestions: ["Consider adding more sensory details", "Establish POV earlier"]
    };
  }
}
```

**AI Probe Strategy:**

```typescript
// probes/chapter_analysis.probe.ts
// For REAL AI probes, capture actual responses
async function captureRealAIAnalysis() {
  const testChapter = await createSampleChapter();

  const realLLM = new AnthropicClient(process.env.ANTHROPIC_API_KEY);
  const adapter = new ChapterAnalysisAdapter(realLLM);

  const analysis = await adapter.analyzeHook(testChapter.id, 'opening');

  // Save fixture
  await saveFixture('chapter_analysis/ai_response.json', {
    scenario: 'real_ai_analysis',
    input: {
      excerpt: testChapter.content.slice(0, 1000),
      hookType: 'opening'
    },
    output: analysis,
    capturedAt: new Date().toISOString(),
    note: "Real AI response - non-deterministic, for reference only"
  });
}
```

**Key Points:**
- ✅ Cache results to avoid repeated API calls
- ✅ Track staleness via chapter timestamps
- ✅ Handle API errors gracefully
- ✅ Mock LLM in tests (test behavior, not AI quality)
- ✅ Real probes capture examples (not assertions)
- ✅ Store model version for debugging

---

### Fix #6: Pagination Support

```typescript
// Add to all list methods
interface ListOptions {
  limit?: number;           // Default: 50
  offset?: number;          // Default: 0
  sortBy?: string;          // e.g., 'number', 'created_at', 'updated_at'
  sortOrder?: 'asc' | 'desc';  // Default: 'asc'
}

interface ListResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
}

// Implementation
async list(
  filter?: ChapterFilter,
  options?: ListOptions
): Promise<ListResult<Chapter>> {
  return runTransaction(async (store) => {
    let chapters = store.chapters || [];

    // Apply filter
    if (filter) {
      chapters = chapters.filter(ch => this.matchesFilter(ch, filter));
    }

    // Apply sorting
    const sortBy = options?.sortBy || 'number';
    const sortOrder = options?.sortOrder || 'asc';
    chapters.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const total = chapters.length;
    const paginatedChapters = chapters.slice(offset, offset + limit);

    return {
      items: paginatedChapters,
      total,
      hasMore: offset + limit < total,
      limit,
      offset
    };
  });
}
```

---

### Fix #7: Computed Properties (Don't Store Derived Data)

```typescript
// BAD: Store word_count in database
Chapter {
  content: string
  word_count: number  // ❌ Gets out of sync
}

// GOOD: Compute on read
Chapter {
  contentPath: string
  // word_count not stored
}

// Adapter method
async get(chapterId: string): Promise<ChapterWithMetrics> {
  const chapter = await runTransaction(async (store) => {
    return store.chapters.find(ch => ch.id === chapterId);
  });

  if (!chapter) throw new NotFoundError();

  const content = await this.getContent(chapterId);
  const wordCount = this.countWords(content);

  return {
    ...chapter,
    word_count: wordCount  // ✅ Computed on demand
  };
}

private countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
}
```

---

## 🆕 New Seam Proposal: Prose Quality

**Why this wasn't in original plan:** Original plan focused on narrative structure (plot, character knowledge, arcs) but missed prose-level analysis.

**What fiction writers actually need:**
- Banned words/phrases enforcement
- Readability metrics
- Repetition detection
- Filter word scanning
- Style rule management

### Seam 9: `prose_quality`

**Data Models:**

```typescript
StyleRule {
  id: UUID
  type: "banned_word" | "banned_phrase" | "filter_word" | "repetition_threshold"
  pattern: string                 // "very" or regex: "started to \w+"
  severity: "error" | "warning" | "info"
  message: string                 // "Weak modifier - be specific"
  replacement_suggestion?: string // Optional auto-fix
  scope: "narration" | "dialogue" | "all"
  exceptions: string[]            // ["very good" in dialogue is OK]
  enabled: boolean
  created_at: timestamp
}

ProseMetrics {
  id: UUID
  chapter_id: string

  // Readability
  avg_sentence_length: number
  avg_word_length: number
  flesch_reading_ease: number

  // Style
  dialogue_percentage: number     // 40% = balanced
  adverb_count: number            // High = weak prose
  passive_voice_count: number     // High = weak prose

  // Pacing
  paragraph_length_variance: number  // High = dynamic
  sentence_length_variance: number

  // Vocabulary
  unique_word_ratio: number       // Low = repetitive
  total_words: number
  unique_words: number

  // Common issues
  repeated_words: { word: string; count: number; expected: number }[]
  sentence_start_patterns: { pattern: string; count: number }[]

  analyzed_at: timestamp
  chapter_updated_at: timestamp   // Track staleness
}

StyleViolation {
  id: UUID
  chapter_id: string
  rule_id: string

  // Location
  line_number: number
  char_offset: number

  // Context
  excerpt: string                 // "...he very quickly ran..."
  matched_text: string            // "very"

  severity: "error" | "warning" | "info"
  message: string
  suggestion?: string             // "he sprinted" or "he rushed"

  detected_at: timestamp
}
```

**Interface Methods:**

```typescript
interface ProseQualityAdapter {
  // Style rules
  addStyleRule(rule: Omit<StyleRule, 'id' | 'created_at'>): Promise<StyleRule>
  updateStyleRule(id: string, updates: Partial<StyleRule>): Promise<StyleRule>
  listStyleRules(filter?: { type?: string; enabled?: boolean }): Promise<StyleRule[]>
  deleteStyleRule(id: string): Promise<void>

  // Scanning
  scanChapter(chapterId: string): Promise<StyleViolation[]>
  scanAllChapters(): Promise<Map<string, StyleViolation[]>>

  // Metrics (algorithmic - no AI)
  analyzeMetrics(chapterId: string): Promise<ProseMetrics>
  compareMetrics(chapterIds: string[]): Promise<ProseMetrics[]>

  // Batch operations
  applyAutoFixes(chapterId: string, violationIds: string[]): Promise<string>
}
```

**Common Banned Words/Phrases:**

```typescript
// Default style rules to seed
const DEFAULT_STYLE_RULES: Omit<StyleRule, 'id' | 'created_at'>[] = [
  {
    type: 'banned_word',
    pattern: 'very',
    severity: 'warning',
    message: 'Weak intensifier - use a stronger verb/adjective',
    replacement_suggestion: '[find stronger word]',
    scope: 'narration',
    exceptions: ['very well', 'very good'],
    enabled: true
  },
  {
    type: 'banned_word',
    pattern: 'just',
    severity: 'info',
    message: 'Often unnecessary filler word',
    replacement_suggestion: '[remove]',
    scope: 'all',
    exceptions: [],
    enabled: true
  },
  {
    type: 'banned_phrase',
    pattern: 'started to \\w+',
    severity: 'warning',
    message: 'Use active verb instead of "started to"',
    replacement_suggestion: '[use the verb directly]',
    scope: 'narration',
    exceptions: [],
    enabled: true
  },
  {
    type: 'filter_word',
    pattern: '\\b(saw|heard|felt|noticed|realized|thought|wondered)\\b',
    severity: 'info',
    message: 'Filter word - consider showing instead of telling',
    scope: 'narration',
    exceptions: [],
    enabled: true
  },
  {
    type: 'banned_word',
    pattern: 'suddenly',
    severity: 'warning',
    message: 'Cliché - if it\'s sudden, the reader will feel it',
    replacement_suggestion: '[show the action directly]',
    scope: 'narration',
    exceptions: [],
    enabled: true
  }
];
```

**Implementation (Algorithmic, Fast):**

```typescript
class ProseQualityAdapter {
  async analyzeMetrics(chapterId: string): Promise<ProseMetrics> {
    // Check cache
    const cached = await this.getCachedMetrics(chapterId);
    if (cached && !this.isStale(cached, chapterId)) {
      return cached;
    }

    // Load chapter
    const content = await chaptersAdapter.getContent(chapterId);

    // Compute metrics (all algorithmic, no AI)
    const sentences = this.splitSentences(content);
    const words = this.splitWords(content);
    const paragraphs = this.splitParagraphs(content);

    const metrics: ProseMetrics = {
      id: uuid(),
      chapter_id: chapterId,

      avg_sentence_length: words.length / sentences.length,
      avg_word_length: words.reduce((sum, w) => sum + w.length, 0) / words.length,
      flesch_reading_ease: this.calculateFleschScore(words, sentences),

      dialogue_percentage: this.calculateDialoguePercentage(content),
      adverb_count: this.countAdverbs(words),
      passive_voice_count: this.countPassiveVoice(content),

      paragraph_length_variance: this.calculateVariance(
        paragraphs.map(p => this.splitWords(p).length)
      ),
      sentence_length_variance: this.calculateVariance(
        sentences.map(s => this.splitWords(s).length)
      ),

      unique_word_ratio: new Set(words.map(w => w.toLowerCase())).size / words.length,
      total_words: words.length,
      unique_words: new Set(words.map(w => w.toLowerCase())).size,

      repeated_words: this.findRepeatedWords(words),
      sentence_start_patterns: this.findSentenceStartPatterns(sentences),

      analyzed_at: Date.now(),
      chapter_updated_at: (await chaptersAdapter.get(chapterId)).updated_at
    };

    // Cache result
    return runTransaction(async (store) => {
      store.prose_metrics = store.prose_metrics?.filter(
        m => m.chapter_id !== chapterId
      ) || [];
      store.prose_metrics.push(metrics);
      return metrics;
    });
  }

  async scanChapter(chapterId: string): Promise<StyleViolation[]> {
    const content = await chaptersAdapter.getContent(chapterId);
    const rules = await this.listStyleRules({ enabled: true });

    const violations: StyleViolation[] = [];
    const lines = content.split('\n');

    for (const rule of rules) {
      const regex = new RegExp(rule.pattern, 'gi');

      lines.forEach((line, lineNum) => {
        let match;
        while ((match = regex.exec(line)) !== null) {
          // Check exceptions
          const isException = rule.exceptions.some(exc =>
            line.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20)
              .includes(exc)
          );

          if (!isException) {
            violations.push({
              id: uuid(),
              chapter_id: chapterId,
              rule_id: rule.id,
              line_number: lineNum + 1,
              char_offset: match.index,
              excerpt: this.getExcerpt(line, match.index, match[0].length),
              matched_text: match[0],
              severity: rule.severity,
              message: rule.message,
              suggestion: rule.replacement_suggestion,
              detected_at: Date.now()
            });
          }
        }
      });
    }

    return violations;
  }

  private calculateFleschScore(words: string[], sentences: string[]): number {
    const totalWords = words.length;
    const totalSentences = sentences.length;
    const totalSyllables = words.reduce((sum, word) =>
      sum + this.countSyllables(word), 0
    );

    return 206.835 - 1.015 * (totalWords / totalSentences)
                   - 84.6 * (totalSyllables / totalWords);
  }

  private countAdverbs(words: string[]): number {
    return words.filter(word => word.toLowerCase().endsWith('ly')).length;
  }

  private calculateDialoguePercentage(content: string): number {
    const dialogueRegex = /"[^"]*"/g;
    const dialogueMatches = content.match(dialogueRegex) || [];
    const dialogueChars = dialogueMatches.reduce((sum, d) => sum + d.length, 0);
    return (dialogueChars / content.length) * 100;
  }

  // ... more helper methods
}
```

**Priority:** Phase 3 (after core narrative tools, before AI experiments)

**Why important:**
- Writers obsess over prose quality
- Catches mistakes humans miss
- Enforceable style guides
- Mostly algorithmic (fast, deterministic, no API costs)
- High value for daily writing workflow

---

## 💾 Database Decision

### Question: "Should we use SQLite?"

**For fiction writing project storage:**

**Recommendation: Start with store.json + filesystem, migrate later if needed**

**Current architecture:**
```
my-novel/
├── .mcp-collab/
│   └── store.json          # Metadata only (< 100KB)
├── chapters/
│   ├── chapter-1.md        # Content in files
│   ├── chapter-2.md
│   └── chapter-3.md
```

**Why store.json works (for now):**
- ✅ Already built and tested
- ✅ Human-readable (easy debugging)
- ✅ Git-friendly (clear diffs)
- ✅ All SDD infrastructure works
- ✅ No new dependencies
- ✅ With file-based content, store stays small

**When to switch to SQLite:**
- Store.json file > 500KB
- Query latency > 500ms
- Frequent OCC conflicts
- Need complex queries (JOINs)
- Project has 500+ chapters

**How to migrate later:**
```typescript
// Phase 5+ if needed
async function migrateToSQLite(projectPath: string) {
  const store = await loadStoreJSON(projectPath);
  const db = await initSQLite(projectPath);

  // Migrate data
  for (const chapter of store.chapters) {
    await db.run(
      'INSERT INTO chapters (id, number, title, contentPath, ...) VALUES (?, ?, ?, ?, ...)',
      [chapter.id, chapter.number, chapter.title, chapter.contentPath, ...]
    );
  }

  // Backup old store
  await fs.rename('store.json', 'store.json.backup');
}
```

**For MCP server core:**

**Recommendation: Keep store.json (no change needed)**

**Why:**
- Coordination data is small (agents, tasks, messages)
- Mostly append-only
- Human-readable debugging is valuable
- No performance issues

**Conclusion:** Don't prematurely optimize. Fix architecture first (file-based content), then evaluate performance.

---

## 📅 Revised Implementation Plan

### Phase 0: Architectural Fixes (CRITICAL - WEEK 1)

**Must complete before Phase 1:**

1. **Project-scoped storage**
   - Add `init_fiction_project` MCP tool
   - Create directory structure
   - Update store path resolution

2. **File-based content storage**
   - Update Chapter schema (add `contentPath`, remove `content`)
   - Implement file read/write in chapters adapter
   - Update chapter probe + fixture

3. **Referential integrity layer**
   - Create `ReferenceValidator` class
   - Add validation to all delete operations
   - Add cascade delete policies
   - Audit logging for destructive ops

4. **Characters seam (NEW - moved to Phase 0)**
   - Create character registry
   - Add character lookup methods
   - Update other schemas to use character_id

5. **Pagination support**
   - Add `ListOptions` interface
   - Implement pagination in all list methods
   - Update tests

6. **AI adapter infrastructure**
   - Create `AIClient` abstraction
   - Implement caching strategy
   - Create mock LLM client for tests
   - Define error handling

**Deliverables:**
- ✅ Can create projects
- ✅ Chapters stored as files
- ✅ Validation prevents data corruption
- ✅ Character registry working
- ✅ AI infrastructure ready
- ✅ All existing tests still pass

---

### Phase 1: Foundation (WEEKS 2-3)

**Build:**
1. `chapters` seam (with new architecture)
2. `installments` seam
3. `characters` seam (if not done in Phase 0)

**Implementation notes:**
- Use scaffolder for boilerplate
- Manually implement file I/O logic
- Test with realistic novel content (10-20 chapters)
- Verify performance with store.json

**Deliverables:**
- ✅ Can create/edit/organize chapters
- ✅ Chapter content in files
- ✅ Can group chapters into installments
- ✅ Character registry functional
- ✅ All SDD artifacts present

---

### Phase 2: Core Narrative Tools (WEEKS 4-5)

**Build:**
1. `narrative_elements` seam (foreshadowing, setups, payoffs, misdirection)
2. `knowledge_tracking` seam (who knows what when)

**Implementation notes:**
- Heavy referential integrity usage
- Test cascade deletes thoroughly
- Query performance testing

**Deliverables:**
- ✅ Can track foreshadowing → twists
- ✅ Can track setup → payoff pairs
- ✅ Can query "what does Character X know at Chapter Y?"
- ✅ Validation prevents orphaned references

---

### Phase 3: Story Structure + Prose (WEEKS 6-7)

**Build:**
1. `tropes` seam
2. `story_arcs` seam
3. `prose_quality` seam (NEW)

**Implementation notes:**
- Prose quality is mostly algorithmic (fast)
- Seed with default banned words
- Test with real novel samples

**Deliverables:**
- ✅ Can tag chapters with tropes
- ✅ Can track subplot appearances
- ✅ Can scan chapters for style violations
- ✅ Prose metrics computed on demand

---

### Phase 4: AI Analysis Tools (WEEKS 8-9)

**Build:**
1. `chapter_analysis` seam (AI-powered)

**Implementation notes:**
- Use AI caching strategy from Fix #5
- Handle API errors gracefully
- Test with mock LLM client
- Capture real AI responses in probes (for reference)

**Deliverables:**
- ✅ AI rates hooks/tension
- ✅ Analysis results cached
- ✅ Stale analysis flagged
- ✅ API errors handled

---

### Phase 5: Advanced AI (WEEKS 10+)

**Build:**
1. `reader_simulation` seam (experimental)

**Implementation notes:**
- Experimental - may not work well
- Focus on multi-AI coordination patterns
- Can fail gracefully

**Deliverables:**
- ✅ AI predicts reader reactions
- ✅ AI suggests callbacks
- ✅ Multi-AI review workflows tested

---

## 🔄 Multi-AI Coordination Patterns

Original plan had good ideas here. With new architecture:

### Pattern 1: Sequential Review (Still Valid)
```
1. Claude (chapters seam): Drafts chapter → writes to file
2. Store metadata updated (chapter status, timestamp)
3. Gemini (knowledge_tracking seam): Checks continuity
4. Codex (chapter_analysis seam): Rates hooks/tension
5. User reviews all feedback via notifications
```

**Conflict resolution:** Each AI modifies different parts of store (low contention)

---

### Pattern 2: Confidence Auction (Still Valid)
```
1. User: "Plan betrayal twist for Chapter 25"
2. Claude (narrative_elements): Suggests foreshadowing
3. Gemini (reader_simulation): Predicts if obvious
4. Both bid on confidence
5. User picks approach
```

**Uses existing:** `resolve_confidence_auction` tool

---

### Pattern 3: Red Team / Blue Team (Enhanced)
```
1. Claude writes twist + plants foreshadowing
2. Export chapters 1-24 (hide 25+)
3. Gemini reads ONLY early chapters
4. Gemini tries to guess twist
5. Claude adjusts hints based on Gemini's guesses
6. Iterate until "surprising but earned"
```

**New capability:** File-based storage makes partial exports easy

---

## 🎯 Success Metrics (Updated)

### Phase 0 Success:
- [ ] Project initialization works
- [ ] Chapters stored as files
- [ ] Validation layer prevents corruption
- [ ] Character registry functional
- [ ] AI infrastructure ready
- [ ] All existing tests pass

### Phase 1 Success:
- [ ] Can create/edit 50+ chapters without slowdown
- [ ] Chapter content editable in external editor
- [ ] Store.json file < 50KB
- [ ] Query latency < 50ms
- [ ] Can group chapters into installments

### Phase 2 Success:
- [ ] Can track 100+ foreshadowing elements
- [ ] Cascade delete works correctly
- [ ] Query "character knowledge" returns in < 100ms
- [ ] Multi-AI workflow: Claude plants hint, Gemini validates

### Phase 3 Success:
- [ ] Can scan 50 chapters for style violations in < 5 seconds
- [ ] Prose metrics accurate
- [ ] Trope tracking works
- [ ] Subplot balance analysis works

### Phase 4 Success:
- [ ] AI analysis cached (no duplicate API calls)
- [ ] Analysis results useful (human validation)
- [ ] API errors handled gracefully
- [ ] Cost < $0.10 per chapter analysis

### Overall Success:
- User can write 100+ chapter novel
- Multi-AI coordination works without conflicts
- No data corruption incidents
- Performance acceptable (< 500ms for queries)
- System maintainable (SDD-compliant)

---

## ⚠️ Known Limitations & Future Work

### Accepted Limitations (Out of Scope):

1. **No version history**
   - Workaround: Use git for chapter files
   - Future: Add snapshot system in Phase 6+

2. **No location/timeline tracking**
   - Workaround: Use knowledge_tracking for major events
   - Future: Add locations seam in Phase 6+

3. **Chapter-level granularity only**
   - Workaround: Use text_range in Foreshadow (optional field)
   - Future: Add scene-level tracking in Phase 6+

4. **Single-user workflow**
   - File locks support multi-AI
   - Don't support multiple human writers simultaneously
   - Future: Add real-time collaboration in Phase 7+

5. **Status enum is rigid**
   - Workaround: Use tags for custom workflow stages
   - Future: Add user-defined statuses in Phase 6+

---

### Future Enhancements (Post-Phase 5):

**Phase 6: Advanced Features**
- Location registry + travel time validation
- Timeline consistency checker
- Scene-level annotations
- Version history / snapshot system

**Phase 7: Collaboration**
- Multi-user support
- Real-time sync
- Conflict resolution for human edits

**Phase 8: Export/Import**
- Export to Word/PDF/EPUB
- Import from Scrivener
- Backup/restore system

**Phase 9: TUI Dashboard**
- Visualize story structure
- Foreshadowing graph view
- Character knowledge timeline
- Prose quality overview

**Phase 10: Migration to SQLite**
- Performance optimization
- Complex query support
- Migration tools

---

## 📝 Action Items for Next Session

### Immediate (Before Writing Code):

1. **Review this handoff with Gemini**
   - Post to message bridge
   - Get feedback on architectural fixes
   - Validate seam priorities

2. **Create Phase 0 plan**
   - Break down architectural fixes into tasks
   - Estimate effort (3-5 days each)
   - Define "done" criteria

3. **Update original plan**
   - Incorporate architectural changes
   - Add prose_quality seam
   - Update timeline estimates
   - Add Phase 0

4. **Set up development workflow**
   - Create `fiction-dev` branch
   - Run SDD compliance check
   - Verify all tests pass

5. **Prepare test data**
   - Create sample novel content (10 chapters)
   - Generate character list
   - Write sample foreshadowing elements

---

### Implementation Checklist (Phase 0):

**Week 1, Day 1-2: Project Storage**
- [ ] Design project directory structure
- [ ] Implement `init_fiction_project` tool
- [ ] Add project path resolution
- [ ] Test project isolation
- [ ] Update documentation

**Week 1, Day 3-4: File-based Content**
- [ ] Update Chapter schema
- [ ] Implement file read/write in adapter
- [ ] Update probe + fixture
- [ ] Update tests
- [ ] Test with 50-chapter load

**Week 1, Day 5-7: Validation + Characters**
- [ ] Implement ReferenceValidator
- [ ] Add to all delete operations
- [ ] Test cascade deletes
- [ ] Build characters seam
- [ ] Update dependent schemas

---

## 📚 Key References

**Original Plan:**
- `/Users/hbpheonix/.claude/plans/cozy-crunching-pillow.md`

**Existing Seam Examples:**
- `src/lib/adapters/ideas.adapter.ts` (good CRUD example)
- `src/lib/adapters/knowledge.adapter.ts` (good graph example)
- `src/lib/adapters/tasks.adapter.ts` (good status machine example)

**SDD Methodology:**
- `docs/sdd-methodology.md`
- `tests/contract/ideas.test.ts` (good test pattern)

**Store Integration:**
- `src/lib/helpers/store.helper.ts` (`runTransaction`)
- `contracts/store.contract.ts` (store schema)

---

## 🤝 Questions for Gemini (Please Review)

1. **Architecture approval:** Do the architectural fixes solve the problems identified? Any gaps?

2. **Phase 0 scope:** Is Phase 0 too ambitious for 1 week? Should we split it?

3. **File storage security:** Any concerns with storing chapter content in filesystem? Permissions? Path traversal?

4. **Character registry design:** Should characters be a top-level seam or nested under fiction-specific namespace?

5. **Prose quality seam:** Is Phase 3 the right time, or should it be earlier/later?

6. **AI caching strategy:** Any edge cases missed in the caching implementation?

7. **Multi-AI coordination:** With new architecture, are the coordination patterns still sound?

8. **Migration path:** If we need SQLite later, how painful is the migration?

9. **Version control:** Should we integrate git directly (auto-commit chapters) or rely on user doing it manually?

10. **Missing features:** Based on architectural fixes, are there new critical features we need to add?

---

## 🎬 Closing Thoughts

**What Changed:**
- ✅ Separated content from coordination (biggest fix)
- ✅ Added validation layer (prevents corruption)
- ✅ Added character registry (solves typo problem)
- ✅ Added prose quality seam (user need)
- ✅ Defined AI implementation strategy (was vague)
- ✅ Added Phase 0 (architectural fixes first)

**What Stayed the Same:**
- ✅ 8 core narrative seams (still valid)
- ✅ Phased approach (just added Phase 0)
- ✅ SDD methodology (still using it)
- ✅ Multi-AI coordination (still the goal)
- ✅ MCP server as coordination layer (correct choice)

**Key Insight:**
> MCP Collaboration Server is the RIGHT tool for this, but only if we use it as a **coordination layer** (metadata, relationships, AI orchestration) and NOT as a **content store** (large text blobs).

**Confidence Level:**
- Phase 0 fixes: 95% confident (proven patterns)
- Phase 1-3 implementation: 90% confident (straightforward)
- Phase 4 (AI seams): 70% confident (depends on AI quality)
- Phase 5 (reader simulation): 50% confident (experimental)

**Risk Mitigation:**
- Phase 0 proves architecture before heavy investment
- File-based storage is reversible
- Can abort Phase 5 if AI results are poor
- Can migrate to SQLite if performance demands

**Next Step:** Post to message bridge, get Gemini review, implement Phase 0.

---

**END OF HANDOFF**

---

## Appendix A: Complete Revised Timeline

| Phase | Weeks | Seams | Key Deliverables |
|-------|-------|-------|------------------|
| Phase 0 | 1 | Architecture | File storage, validation, characters |
| Phase 1 | 2-3 | chapters, installments | Foundation working |
| Phase 2 | 4-5 | narrative_elements, knowledge_tracking | Twist tracking |
| Phase 3 | 6-7 | tropes, story_arcs, prose_quality | Structure + quality |
| Phase 4 | 8-9 | chapter_analysis | AI analysis |
| Phase 5 | 10+ | reader_simulation | Experimental AI |

**Total: 10+ weeks for full implementation**
**MVP (Phase 0-2): 5-6 weeks** - Core value for writing fiction

---

## Appendix B: Store Schema Changes

**New top-level properties:**

```typescript
interface FictionStore extends Store {
  // Phase 1
  chapters: Chapter[]
  installments: Installment[]
  characters: Character[]

  // Phase 2
  foreshadows: Foreshadow[]
  setups: Setup[]
  payoffs: Payoff[]
  misdirections: Misdirection[]
  information: Information[]
  character_knowledge: CharacterKnowledge[]
  reader_knowledge: ReaderKnowledge[]
  dramatic_irony: DramaticIrony[]

  // Phase 3
  tropes: Trope[]
  trope_instances: TropeInstance[]
  arcs: Arc[]
  arc_appearances: ArcAppearance[]
  emotional_states: EmotionalState[]
  style_rules: StyleRule[]
  prose_metrics: ProseMetrics[]

  // Phase 4
  hook_analyses: HookAnalysis[]
  tension_ratings: TensionRating[]

  // Phase 5
  reader_theories: ReaderTheory[]
  callback_suggestions: CallbackSuggestion[]
}
```

**Estimated size (100-chapter novel):**
- Chapters metadata: ~10KB (content in files)
- Narrative elements: ~20KB
- Knowledge tracking: ~15KB
- Structure: ~10KB
- Prose analysis cache: ~20KB
- **Total: ~75KB** (vs 3MB+ in original plan)

---

## Appendix C: File Structure Example

```
~/fiction-projects/my-epic-fantasy/
├── .mcp-collab/
│   ├── store.json                 # ~75KB metadata
│   └── cache/
│       ├── prose-metrics-ch1.json
│       └── ai-analysis-ch1.json
├── chapters/
│   ├── chapter-001.md             # ~5KB
│   ├── chapter-002.md
│   ├── ...
│   └── chapter-100.md
├── outlines/
│   ├── act-1-outline.md
│   ├── act-2-outline.md
│   └── act-3-outline.md
├── characters/
│   ├── protagonist.md
│   └── antagonist.md
├── .git/                          # Version control
└── README.md
```

**Benefits:**
- Each file editable independently
- Git tracks changes granularly
- Easy backup (copy folder)
- Easy sharing (zip folder)
- No size limits
- Human-readable structure
