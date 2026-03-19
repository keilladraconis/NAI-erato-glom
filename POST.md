# Erato-GLoM v0.2.0

GLoM has gotten a lot smarter about context. If you've been running into issues with long stories — weird truncation, GLM losing track of earlier consultations after a lot of writing — this update is for you.

## What's new

**Context budgeting** — GLoM now uses [gen-x](https://www.npmjs.com/package/nai-gen-x) under the hood to manage token limits properly. Instead of hard-cutting the story at a character limit, it trims the middle (older context and history) while always keeping the system prompt and the assistant prefill intact. Your story can grow as long as it needs to.

**Transient error retry** — network hiccups and "in progress" errors will now automatically retry with exponential backoff instead of just dying silently.

**History-aware consultation log** — GLoM's memory of what it previously suggested is now stored per history node. If you undo a generation and branch off in a different direction, GLoM will remember the consultations *from that branch*, not from wherever you came from. This was a correctness bug that could lead to some pretty confused directives.

**Nudge input** — there's now a text field in the GLoM panel where you can type a short directional hint. Something like *"more tension between the two leads"* or *"it's time for the villain to show up"*. GLoM will pass it to GLM as context for the next consultation. It persists per-story so you don't have to retype it every session.

## Get it

The `.naiscript` file is attached below, or grab it from the [GitHub releases page](<https://github.com/keilladraconis/NAI-erato-glom/releases>).

-# Requires NovelAI — install by importing the `.naiscript` file from the Scripts menu.
