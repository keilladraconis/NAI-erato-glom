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
- Toggle on/off per story
- Adjustable consultation interval (every 1-10 generations)
- Fully customizable system prompt
- Manual "GLoM" button for on-demand consultation
- Instruction paragraphs are visually distinct in the editor

## Architecture

### Key Design Decisions

**Manual context assembly.** `api.v1.buildContext()` returns empty for Erato. The script assembles context from scratch: `document.scan()` for story text, `api.v1.lorebook.entries()` for lore, `api.v1.memory.get()` and `api.v1.an.get()` for memory and author's note. This is ordered for prompt cache efficiency: stable content (system prompt, memory, lorebook) first, volatile content (story text) last.

**Instruction placement.** The instruction is inserted as the second-to-last paragraph (`insertParagraphAfter(ids[ids.length - 2])`), so it sits just before the final story paragraph. This positions it where Erato is most likely to attend to it during the next generation.

**One instruction at a time.** The script tracks the current instruction's section ID and removes it before inserting a new one. This prevents instruction accumulation that would clutter the document and confuse Erato.

**Guard against self-triggering.** The `onGenerationEnd` hook checks `params.model === GLM_MODEL` and returns early to avoid a feedback loop where GLM's own generation triggers another consultation.

**Cancellation support.** GLM calls use `createCancellationSignal()` so they can be interrupted if needed.

### Storage Strategy

All settings use `storyStorage` (per-story persistence):

| Key | Type | Default | Purpose |
|---|---|---|---|
| `glom-enabled` | boolean | `false` | Master toggle |
| `glom-interval` | number | `4` | Generations between consultations |
| `glom-prompt` | string | (see below) | System prompt sent to GLM |

### Hooks Used

Only `onGenerationEnd` — confirmed to fire for Erato. The GLM-only hooks (`onBeforeContextBuild`, `onContextBuilt`, `onResponse`) do not fire for Erato and are not used.

### UI

A single script panel ("GLoM") with:
- **Enable checkbox** — toggles automatic consultation; disabling removes any active instruction
- **GLoM button** (heart icon) — triggers an immediate consultation regardless of the counter
- **Interval slider** — 1 to 10 generations between automatic consultations
- **Collapsible system prompt editor** — full multiline text input for the GLM system prompt

## What's Been Accomplished (v0.0.0)

1. **Core consultation loop** — GLM is called on a configurable interval after Erato generations, producing directive instructions that are injected into the document.
2. **Manual context assembly** — Full context (memory, lorebook with keyword matching, author's note, story text) is built from first principles since `buildContext()` doesn't work for Erato.
3. **Instruction lifecycle management** — Clean insert/remove cycle with section ID tracking.
4. **Per-story UI** — Enable toggle, interval slider, manual trigger button, and editable system prompt.
5. **Safety guards** — Self-trigger prevention, cancellation signals, permission requests, graceful error handling.

## Known Limitations and Open Questions

- **No token counting.** Context is truncated by character count (60k chars ~15k tokens) rather than actual token measurement. The tokenizer API (`api.v1.tokenizer`) could be used for precision.
- **Keyword matching is naive.** Lorebook entries are matched with simple `includes()` on lowercased text. NovelAI's native lorebook matching may be more sophisticated (regex, proximity, etc.).
- **No feedback loop.** GLM has no way to know whether its previous directive was effective. A future version could include the previous instruction and the text Erato generated in response.
- **Fixed GLM parameters.** Temperature (0.7) and max tokens (300) are hardcoded. These could be exposed as user settings.
- **No streaming.** GLM responses are awaited in full. Streaming via the callback parameter could provide progress indication.
- **Instruction positioning is static.** Always second-to-last paragraph. Might benefit from smarter positioning based on document structure.
