# Changelog

## [0.4.0] - 2026-4-1
- **Xialong** - Added xialong support as a config option. Enable it if you're an Opus subscriber. Not guaranteed to work for lower subscriptions.

## [0.3.0] - 2026-03-19

### Changed
- **Nudge** - cleared after GLoM consultation. A compromise against adding more UI to glom because GLoM is getting chubb.

## [0.2.0] - 2026-03-18

### Added
- **gen-x integration** — generation calls now go through the [gen-x](https://www.npmjs.com/package/nai-gen-x) queue engine, which adds automatic context budgeting, transient error retry with exponential backoff, and token budget management
- **Context pinning** — system prompt and assistant prefill are always preserved; context and consultation history in the middle are trimmed gracefully when the story grows large, instead of hard-truncating at a character limit
- **History-aware consultation log** — past consultations are now stored in `historyStorage` (per history node) rather than in memory, so GLoM's knowledge of what it previously suggested stays coherent when navigating undo/redo
- **Nudge input** — new multiline text field in the GLoM panel for users to suggest a directional hint that gets passed to GLM alongside the story context

## [0.1.2] - 2026-02-17

### Changed
- Disabled extended thinking (`enable_thinking: false`) — GLM-4-6 performs better without it for this task
- Simplified guidance extraction: removed `parsedContent` fallback, use `text` directly

## [0.1.1] - 2026-02-17

### Changed
- Split context and consultation history into separate messages for cleaner cache boundaries
- Added assistant prefill (`"Understood. I will write my directives..."`) to anchor GLM output language and style

## [0.1.0] - 2026-02-17

### Added
- Initial release
- GLM-4-6 consults on story in progress and inserts short directive paragraphs to guide Erato
- Manual context assembly (memory, lorebook, author's note, story text) ordered for cache efficiency
- Rolling consultation history via `RolloverHelper` (2000 tokens, 500 rollover)
- UI panel with heart button (manual trigger) and consultation interval slider (1–10 generations)
- Configurable system prompt via script config
- `documentEdit` permission request for instruction paragraph management
