(async () => {
  // ─── Config ────────────────────────────────────────────────────────

  const GLM_MODEL = 'glm-4-6';
  const GLM_MAX_TOKENS = 300;

  const DEFAULT_PROMPT = `You are a creative writing consultant reviewing a story in progress. Your job is to produce a short directive (2-4 sentences) that will guide the story's next few paragraphs.

Focus on:
- Preventing repetitive loops or stalling
- Advancing the plot or deepening character dynamics
- Suggesting concrete sensory details, emotional beats, or rising tension
- Maintaining consistency with established characters and setting

Your output will be inserted directly into the story as an instruction block. Write ONLY the directive, nothing else. Use second person ("you") if the story is in second person, otherwise match the story's POV. Be specific and vivid, not generic.`;

  // Storage keys (story:-prefixed for per-story persistence)
  const SK_ENABLED = 'story:glom-enabled';
  const SK_INTERVAL = 'story:glom-interval';
  const SK_PROMPT = 'story:glom-prompt';

  // ─── State ─────────────────────────────────────────────────────────

  let genCount = 0;
  let instructionSectionId: number | null = null;
  let consulting = false;
  let glmSignal: { cancel: () => void } | null = null;

  // Initialize defaults if not yet set
  await api.v1.storyStorage.setIfAbsent('glom-enabled', false);
  await api.v1.storyStorage.setIfAbsent('glom-interval', 4);
  await api.v1.storyStorage.setIfAbsent('glom-prompt', DEFAULT_PROMPT);

  // ─── Permissions ───────────────────────────────────────────────────

  const hasDocEdit = await api.v1.permissions.request(
    'documentEdit',
    'GLoM inserts and removes instruction paragraphs to guide the story.'
  );

  // ─── Instruction Management ────────────────────────────────────────

  async function removeInstruction() {
    if (instructionSectionId === null) return;
    try {
      await api.v1.document.removeParagraph(instructionSectionId);
    } catch (_) { /* already gone */ }
    instructionSectionId = null;
  }

  async function insertInstruction(text: string) {
    if (!hasDocEdit) return;
    await removeInstruction();

    const ids = await api.v1.document.sectionIds();
    if (ids.length < 1) return;

    if (ids.length >= 2) {
      await api.v1.document.insertParagraphAfter(ids[ids.length - 2], {
        text,
        source: 'instruction',
      });
    } else {
      await api.v1.document.insertParagraphAfter(0, {
        text,
        source: 'instruction',
      });
    }

    const newIds = await api.v1.document.sectionIds();
    instructionSectionId = newIds.length >= 2
      ? newIds[newIds.length - 2]
      : newIds[0];
  }

  // ─── Context Assembly ──────────────────────────────────────────────
  // buildContext() returns empty for Erato, so we assemble context
  // manually: lorebook entries + memory + story text + author's note.
  // Ordered for cache efficiency: stable content first, volatile last.

  async function assembleContext(): Promise<string> {
    const parts: string[] = [];

    // 1. Memory (stable background/setting info)
    const memory = await api.v1.memory.get();
    if (memory.trim()) {
      parts.push(`[Memory/Setting]\n${memory}`);
    }

    // 2. Lorebook entries — always-on and keyword-matched
    const entries = await api.v1.lorebook.entries();
    const sections = await api.v1.document.scan();
    const storyText = sections
      .filter((s) => s.section.source !== 'instruction')
      .map((s) => s.section.text)
      .join('\n');

    const storyLower = storyText.toLowerCase();
    const activeEntries: string[] = [];

    for (const entry of entries) {
      if (!entry.enabled || !entry.text?.trim()) continue;

      if (entry.forceActivation) {
        // Always-on entry
        activeEntries.push(entry.text);
      } else if (entry.keys?.length) {
        // Keyword-triggered: check if any key appears in story text
        const matched = entry.keys.some(
          (key) => key && storyLower.includes(key.toLowerCase())
        );
        if (matched) {
          activeEntries.push(entry.text);
        }
      }
    }

    if (activeEntries.length) {
      parts.push(`[Lorebook — Active Entries]\n${activeEntries.join('\n\n')}`);
    }

    // 3. Author's Note (user's style/tone guidance)
    const an = await api.v1.an.get();
    if (an.trim()) {
      parts.push(`[Author's Note]\n${an}`);
    }

    // 4. Story text (volatile tail — newest content last)
    if (storyText.trim()) {
      // Truncate from the front if very long, keeping the recent text
      const maxStoryChars = 60000; // ~15k tokens, leaves room for lore/memory
      const trimmed = storyText.length > maxStoryChars
        ? '...\n' + storyText.slice(-maxStoryChars)
        : storyText;
      parts.push(`[Story]\n${trimmed}`);
    }

    return parts.join('\n\n');
  }

  // ─── GLM Consultation ─────────────────────────────────────────────

  async function consultGLM() {
    if (consulting) return;
    consulting = true;

    try {
      const context = await assembleContext();
      if (!context.trim()) return;

      const systemPrompt: string =
        await api.v1.storyStorage.get('glom-prompt') || DEFAULT_PROMPT;

      // Message order for cache efficiency:
      //   1. System prompt (static — always cached)
      //   2. Context (memory/lore stable, story volatile at tail)
      //   3. Instruction (short, always fresh)
      const messages: Message[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
        { role: 'user', content: 'Write your directive for the next few paragraphs.' },
      ];

      const signal = await api.v1.createCancellationSignal();
      glmSignal = signal;

      const response = await api.v1.generate(
        messages,
        {
          model: GLM_MODEL,
          max_tokens: GLM_MAX_TOKENS,
          temperature: 0.7,
        },
        undefined,
        undefined,
        signal
      );

      glmSignal = null;

      const guidance = response.choices[0]?.text?.trim();
      if (guidance) {
        await insertInstruction(`[ ${guidance} ]`);
      }
    } catch (err) {
      if (glmSignal) {
        glmSignal = null;
      } else {
        api.v1.error('GLM consultation failed:', err);
      }
    } finally {
      glmSignal = null;
      consulting = false;
    }
  }

  // ─── UI ────────────────────────────────────────────────────────────

  await api.v1.ui.register([
    {
      type: 'scriptPanel',
      id: 'eg-panel',
      name: 'GLoM',
      content: [
        {
          type: 'row',
          content: [
            {
              type: 'checkboxInput',
              id: 'glom-enabled',
              label: 'Enable',
              storageKey: SK_ENABLED,
              initialValue: false,
              onChange: async (enabled: boolean) => {
                if (!enabled) await removeInstruction();
              },
            },
            {
              type: 'button',
              text: 'GLoM',
              iconId: 'heart',
              callback: consultGLM,
              disabledWhileCallbackRunning: true,
            },
          ],
        },
        {
          type: 'sliderInput',
          id: 'glom-interval',
          label: 'Consultation interval',
          storageKey: SK_INTERVAL,
          min: 1,
          max: 10,
          step: 1,
          initialValue: 4,
          suffix: ' gens',
        },
        {
          type: 'collapsibleSection',
          title: 'System Prompt',
          initialCollapsed: true,
          storageKey: SK_PROMPT + '-collapsed',
          content: [
            {
              type: 'multilineTextInput',
              id: 'glom-prompt',
              storageKey: SK_PROMPT,
              initialValue: DEFAULT_PROMPT,
              placeholder: 'Enter system prompt for GLM...',
              style: { minHeight: '200px' },
            },
          ],
        },
      ],
    },
  ]);

  // ─── Hooks ─────────────────────────────────────────────────────────

  api.v1.hooks.register('onGenerationEnd', async (params) => {
    if (params.model === GLM_MODEL) return;

    const enabled = await api.v1.storyStorage.get('glom-enabled');
    if (!enabled) return;

    const interval: number =
      (await api.v1.storyStorage.get('glom-interval')) || 4;

    genCount++;
    if (genCount >= interval) {
      genCount = 0;
      await consultGLM();
    }
  });
})();
