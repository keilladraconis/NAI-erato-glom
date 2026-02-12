# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Erato-GLoM is a **NovelAI Script** plugin written in TypeScript. It targets the `naiscript-1.0` runtime and compiles to a single `.naiscript` file deployed into the NovelAI creative writing platform.

## Build System

There is no `package.json`. The project uses the `nibs` CLI to build.

- **Build**: `nibs build` — compiles to `dist/NAI-erato-glom.naiscript` (YAML frontmatter + bundled JS).
- **Type-check only**: `npx tsc --noEmit`

## Project Structure

- `src/index.ts` — Entry point. Code runs as an async IIFE.
- `external/script-types.d.ts` — Complete NovelAI Scripting API type definitions (~4200 lines). This is the authoritative reference for all available APIs.
- `project.yaml` — Script metadata (id, name, version, author, memoryLimit, config).
- `dist/` — Build output (do not edit directly).

## NovelAI Scripting API

All APIs are accessed through the global `api.v1` namespace. Key areas:

- **Hooks** (`api.v1.hooks`) — Event handlers for generation lifecycle: `onGenerationRequested`, `onContextBuilt`, `onResponse`, `onGenerationEnd`, `onScriptsLoaded`, `onBeforeContextBuild`, `onLorebookEntrySelected`, `onHistoryNavigated`, `onDocumentConvertedToText`, `onTextAdventureInput`.
- **Generation** (`api.v1.generate`, `api.v1.generateWithStory`) — Chat-based text generation with streaming support.
- **Document** (`api.v1.document`) — Paragraph manipulation, scanning, selection, history (undo/redo).
- **Editor** (`api.v1.editor`) — Trigger generation, manage selections, decorations (inline markers/widgets).
- **Storage** — Four scopes: `storage` (persistent), `historyStorage` (per history node), `storyStorage` (per story), `tempStorage` (per execution).
- **UI** (`api.v1.ui`) — Register panels, toolbars, buttons; build component trees with `text`, `button`, `slider`, `checkbox`, etc.; show modals/toasts/dialogs.
- **Lorebook** (`api.v1.lorebook`) — CRUD for entries and categories, conditional trigger logic.
- **Author's Note / Memory** (`api.v1.an`, `api.v1.memory`) — Get/set story context injections.
- **Utilities** — `api.v1.log()`, `api.v1.error()`, `api.v1.uuid()`, `api.v1.timers`, `api.v1.dice`, `api.v1.clipboard`, `api.v1.file`, `api.v1.tokenizer`, `api.v1.tts`.
- **Permissions** (`api.v1.permissions`) — Query/request runtime permissions for document/story/lorebook edits.

## TypeScript Configuration

Strict mode is enabled with additional checks: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`. Target is ES2023 with bundler module resolution.

## Key Conventions

- Wrap all top-level code in an `async` IIFE: `(async () => { ... })();`
- The `api` global is always available — do not import it.
- Consult `external/script-types.d.ts` for API signatures, JSDoc comments, and usage examples before writing code that uses the scripting API.
