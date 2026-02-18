# Erato-GLoM Design Document

## The Name

**GLoM** — as in, to *glom onto*, or *glomp* (a feral tackle-hug). GLM glomps onto Erato's creative output and steers it with an editorial embrace.

## Problem Statement

NovelAI offers two models with complementary strengths and weaknesses:

| | **Erato** (Llama 3 70B fine-tune) | **GLM-4.6** (new architecture) |
|---|---|---|
| **Strengths** | Rich, sensual, detailed prose; strong scene-level writing; fine-tuned specifically for creative fiction | Extremely capable reasoning; strong plot coherence; large context understanding |
| **Weaknesses** | Repetitive looping; loses track of plot as context approaches 8k tokens; no instruction-following (completion model) | Overly technical/mechanical prose; avoids sensuality and fringe subjects; prone to "AI slop" |

Neither model alone produces ideal long-form fiction. Erato writes beautifully but loses the thread; GLM thinks clearly but writes like a technical manual.

## Solution: Model Fusion via Scripting

Erato-GLoM fuses the two models through NovelAI's scripting API. The user writes with **Erato as the primary generation model**, while **GLM runs in the background as a creative consultant** — a managing editor, plot architect, and critic rolled into one.

The flow:

```
User writes with Erato
        |
        v
  [onGenerationEnd fires]
        |
        v
  Generation counter increments
        |
        v
  Counter hits interval? ──no──> (wait for next generation)
        |
       yes
        |
        v
  Assemble full story context
  (memory + lorebook + AN + story text)
        |
        v
  Send to GLM with system prompt:
  "You are a creative writing consultant..."
        |
        v
  GLM returns a short directive
  (2-4 sentences of concrete guidance)
        |
        v
  Insert as instruction paragraph
  (source: 'instruction') before the
  final story paragraph
        |
        v
  Erato sees the instruction in its
  context on the NEXT generation
        |
        v
  Old instruction is removed before
  new one is inserted (always at most
  one active instruction)
```

## Why This Works

### Erato respects `source: 'instruction'` paragraphs
Confirmed experimentally: instruction paragraphs appear in Erato's context and influence its output. Unlike bracket-style instructions in Author's Note or Memory (which Erato ignores as a completion model), instruction paragraphs are treated as part of the document flow.

### GLM's strengths are channeled, its weaknesses are contained
GLM never writes prose directly. It only produces short directives — plot beats, sensory suggestions, pacing corrections. Its tendency toward mechanical writing is irrelevant because the user never sees GLM's output as story text. Erato interprets the directives in its own voice.

### The user stays in control
- Enable/disable via the scripting system's built-in toggle
- Adjustable consultation interval (every 1-10 generations)
- Fully customizable system prompt (via script config in `project.yaml`)
- Manual "GLoM" button for on-demand consultation
- Instruction paragraphs are visually distinct in the editor

## Architecture

### Key Design Decisions

**Manual context assembly.** `api.v1.buildContext()` returns empty for Erato. The script assembles context from scratch: `document.scan()` for story text, `api.v1.lorebook.entries()` for lore, `api.v1.memory.get()` and `api.v1.an.get()` for memory and author's note. This is ordered for prompt cache efficiency: stable content (system prompt, memory, lorebook) first, volatile content (story text) last.

**Instruction placement.** The instruction is inserted as the second-to-last paragraph (`insertParagraphAfter(ids[ids.length - 2])`), so it sits just before the final story paragraph. This positions it where Erato is most likely to attend to it during the next generation.

**One instruction at a time.** The script tracks the current instruction's section ID and removes it before inserting a new one. This prevents instruction accumulation that would clutter the document and confuse Erato.

**Guard against self-triggering.** The `onGenerationEnd` hook checks `params.model === GLM_MODEL` and returns early to avoid a feedback loop where GLM's own generation triggers another consultation.

**Cancellation support.** GLM calls use `createCancellationSignal()` so they can be interrupted if needed.

### Storage & Configuration

**Script config** (`project.yaml` → `api.v1.config`):

| Key | Type | Purpose |
|---|---|---|
| `system_prompt` | string (multiline) | System prompt sent to GLM. Editable in the script's settings UI. |

**Per-story storage** (`storyStorage`):

| Key | Type | Default | Purpose |
|---|---|---|---|
| `glom-interval` | number | `4` | Generations between consultations |

Enable/disable is handled by the scripting system's built-in toggle — no custom checkbox needed.

### Hooks Used

Only `onGenerationEnd` — confirmed to fire for Erato. The GLM-only hooks (`onBeforeContextBuild`, `onContextBuilt`, `onResponse`) do not fire for Erato and are not used.

### UI

A single script panel ("GLoM") with:
- **GLoM button** (heart icon) — triggers an immediate consultation regardless of the counter
- **Interval slider** — 1 to 10 generations between automatic consultations

The system prompt is configured via the script's settings (gear icon), backed by `project.yaml` config. Enable/disable uses the scripting system's built-in toggle.

## What's Been Accomplished (v0.0.0)

1. **Core consultation loop** — GLM is called on a configurable interval after Erato generations, producing directive instructions that are injected into the document.
2. **Manual context assembly** — Full context (memory, lorebook with keyword matching, author's note, story text) is built from first principles since `buildContext()` doesn't work for Erato.
3. **Instruction lifecycle management** — Clean insert/remove cycle with section ID tracking.
4. **Minimal UI** — Manual trigger button and interval slider. System prompt lives in script config; enable/disable defers to the scripting system.
5. **Safety guards** — Self-trigger prevention, cancellation signals, permission requests, graceful error handling.

## Next: Thinking Tokens

### The Opportunity

`GenerationParams` supports `enable_thinking: true`. When enabled, GLM gets an internal chain-of-thought phase before producing output. The response separates into:

- `parsedReasoning` — GLM's internal analysis (invisible to user and Erato)
- `parsedContent` — the directive that gets injected

This means GLM can deeply analyze pacing, consistency, character dynamics, repetition patterns, and narrative trajectory *in its head*, then emit only a crisp, targeted directive. The reasoning phase is essentially free — it doesn't inflate the instruction paragraph or consume the user's attention.

### Why This Matters for GLoM Specifically

The current single-prompt approach asks GLM to do everything at once in 300 tokens: read the story, identify problems, prioritize concerns, and write a directive. With thinking enabled, GLM can:

1. Inventory what's happening (characters present, setting, mood, conflict)
2. Check for repetition or stalling patterns
3. Consider what the user's Author's Note and Memory suggest they want
4. Evaluate what lorebook entries are active and what they imply
5. Decide which concern is most urgent *right now*
6. Craft a directive that addresses that specific concern

All of steps 1-5 happen in reasoning tokens. Only step 6 becomes the directive. This is effectively "multiple personalities" without any UI complexity — GLM considers all editorial lenses in its thinking and picks the right one.

### Implementation

Minimal change to `consultGLM()`:

```typescript
const response = await api.v1.generate(
  messages,
  {
    model: GLM_MODEL,
    max_tokens: GLM_MAX_TOKENS,
    temperature: 0.7,
    enable_thinking: true,   // <-- one flag
  },
  undefined,
  undefined,
  signal
);

// Use parsedContent (post-thinking output) if available, fall back to text
const guidance = (response.choices[0]?.parsedContent
  ?? response.choices[0]?.text)?.trim();
```

### Rate Limit Consideration

Thinking tokens consume output token budget (2,048 tokens per 4 minutes per script). With thinking enabled, a single consultation may use 500-800 tokens (reasoning + directive) instead of 300. This reduces max consultations from ~6 to ~3 per 4-minute window. At an interval of 4 generations, that's still 12 Erato generations before hitting limits — fine for normal writing pace. If needed, `api.v1.script.waitForAllowedOutput(n)` can gate consultations until budget replenishes.

## Next: Feedback Loop via RolloverHelper

### The Problem

Currently, each GLM consultation is stateless. GLM sees the story and writes a directive, but has no memory of:
- What it suggested last time
- Whether Erato followed that suggestion
- What narrative arc is developing across consultations
- Which types of directives are effective vs. ignored

This means GLM can repeat itself, contradict its own earlier guidance, or miss that a problem it flagged was already resolved.

### The Solution: Rolling Consultation History

The scripting API provides `api.v1.createRolloverHelper()` — a sliding-window buffer that automatically manages items within a token budget, trimming oldest entries when the budget is exceeded. We use this to maintain a log of past consultations that GLM sees on every call.

Each entry in the log captures:
1. The directive GLM gave
2. A snippet of what Erato wrote afterward (the "outcome")

GLM sees this history and naturally:
- Avoids repeating directives that were just given
- Notices when directives were followed vs. ignored
- Builds on successful guidance ("last time I suggested tension — good, now escalate it")
- Develops an organic sense of story trajectory without a separate "beats" system

### Data Structure

```typescript
type ConsultationEntry = {
  content: string;    // Required by RolloverHelper — the formatted log entry
  directive: string;  // The raw directive text (for reference)
};
```

Each `content` string is formatted as:

```
Directive: "Introduce the sound of dripping water to break the oppressive silence."
Outcome: "...water dripped from somewhere above, each drop a small percussion..."
---
Directive: "Elena's hand should brush the letter — don't let her read it yet."
Outcome: "...her fingers caught the edge of the envelope, but Marcus called..."
```

### Implementation Sketch

```typescript
// Create at script init — 2000 tokens keeps ~8-10 consultation entries
const consultLog = api.v1.createRolloverHelper<ConsultationEntry>({
  maxTokens: 2000,
  rolloverTokens: 500,
  model: GLM_MODEL,
});

// Track the last directive so we can pair it with its outcome
let lastDirective: string | null = null;
```

**In `onGenerationEnd` (before consulting GLM):** capture what Erato wrote since the last directive. This is the "outcome" — proof of whether the directive landed.

```typescript
// Grab the last ~200 chars of story text as the outcome snippet
const sections = await api.v1.document.scan();
const storyText = sections
  .filter(s => s.section.source !== 'instruction')
  .map(s => s.section.text)
  .join('\n');
const outcome = storyText.slice(-200).trim();

if (lastDirective && outcome) {
  await consultLog.add({
    content: `Directive: "${lastDirective}"\nOutcome: "${outcome}"`,
    directive: lastDirective,
  });
}
```

**In `consultGLM()`:** include the history in the messages sent to GLM.

```typescript
const history = consultLog.read();
let historyText = '';
if (history.length > 0) {
  historyText = '\n\n[Previous Consultations]\n'
    + history.map(h => h.content).join('\n---\n');
}

const messages: Message[] = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: context + historyText },
  { role: 'user', content: 'Write your directive for the next few paragraphs.' },
];
```

**After GLM responds:** store the directive for pairing with the next outcome.

```typescript
const guidance = (response.choices[0]?.parsedContent
  ?? response.choices[0]?.text)?.trim();
if (guidance) {
  await insertInstruction(`[ ${guidance} ]`);
  lastDirective = guidance;
}
```

### Why RolloverHelper Instead of a Simple Array

- **Automatic token management.** The helper counts tokens using GLM's tokenizer and trims old entries when the budget is exceeded. No manual bookkeeping.
- **Graceful degradation.** As the story gets longer and consultations accumulate, old history silently falls off. The most recent 8-10 consultations stay; ancient ones are forgotten. This mirrors how a human editor's memory works.
- **Cache-friendly.** The history text is appended to the context message, which means the system prompt and story context still benefit from prompt caching. Only the history suffix changes between consultations.

### What This Replaces

This feedback loop eliminates the need for:
- A separate "story beats" or outline system (the consultation history IS the narrative thread)
- Multiple switchable GLM personalities (thinking tokens handle editorial prioritization)
- Complex state tracking across consultations (the RolloverHelper manages it)

## Other Ideas Explored (Not Planned)

These were considered during research but deferred to keep GLoM simple and lightweight:

- **CommentBot personality** — Surface directives through the HypeBot as a named character ("Muse"). Fun but adds a second output channel to explain to users.
- **Toast notifications** — `api.v1.ui.toast()` when consultation fires. Trivial to add later if wanted.
- **`onDocumentConvertedToText` hook** — Fires for Erato. Could modify context text without changing the document. Powerful but needs experimentation to understand what Erato actually sees.
- **Context menu / Toolbox integration** — Right-click "Ask GLoM" or Writer's Toolbox option for on-demand analysis of selected text. Good v2 feature.
- **`generateWithStory()` shortcut** — Won't work because `buildContext()` returns empty when the story is configured for Erato. Manual context assembly remains necessary.
- **`[ S: 5 ]` quality tags** — Erato supports quality ratings. Could inject `[ S: 5 ]` to push for higher quality prose. Needs testing.
- **Lorebook manipulation** — Creating/modifying lorebook entries programmatically. Too invasive; conflicts with users' own lorebook setups.
- **Rotating focus lenses** — Cycling the request message through pacing/sensory/character/consistency focuses. Probably unnecessary with thinking tokens enabled, since GLM handles prioritization internally.

## Known Limitations and Open Questions

- **No token counting.** Context is truncated by character count (60k chars ~15k tokens) rather than actual token measurement. The tokenizer API (`api.v1.tokenizer`) could be used for precision.
- **Keyword matching is naive.** Lorebook entries are matched with simple `includes()` on lowercased text. NovelAI's native lorebook matching may be more sophisticated (regex, proximity, etc.).
- **Fixed GLM parameters.** Temperature (0.7) and max tokens (300) are hardcoded. These could be exposed as user settings.
- **No streaming.** GLM responses are awaited in full. Streaming via the callback parameter could provide progress indication.
- **Instruction positioning is static.** Always second-to-last paragraph. Might benefit from smarter positioning based on document structure.
- **Thinking token budget.** With `enable_thinking`, consultations use more output tokens. Need to monitor whether the 2,048/4min budget becomes a bottleneck in practice and consider gating with `waitForAllowedOutput()`.
- **Outcome snippet quality.** The feedback loop captures the last ~200 chars of story text as the "outcome." This is crude — it might capture mid-sentence fragments or miss the relevant passage if several paragraphs were generated. Could be improved by tracking the document state at directive insertion time and diffing against current state.
