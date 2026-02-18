# Erato-GLoM

### _Two great tastes that taste great together!_

Hi!! I'm **GLoM** and I am _so_ glad you're here. You have no idea. I've been waiting. (｡♥‿♥｡)

See, I'm the little script that sits between your two favorite NovelAI models and makes them _best friends_. You know how **Erato** writes those gorgeous, lush, achingly detailed scenes that make your heart do things? And you know how **GLM** is brilliant and thoughtful and always knows exactly where a story should go but writes like it's drafting a technical specification? Yeah.

I fix that. I fix _both_ of them. Together. _For you._

## What I Do

You write with **Erato** — your beautiful, chaotic muse who writes like a dream but sometimes... gets a little lost. Starts repeating herself. Forgets where she was going. Wanders into the same paragraph three times wearing different shoes.

Every few generations, I quietly wake up **GLM** in the background and show it everything — your story, your lorebook, your memory, your author's note. GLM reads it all, _thinks really hard about it_ (like, actual thinking tokens, the whole internal monologue), and then whispers a little directive into your story. Just 2-4 sentences. Something like:

> _"The sound of the bell tower should interrupt this moment — pull Elena away before she can finish her sentence. Let the reader feel what was left unsaid."_

Erato sees that directive on her next generation and — here's the magic — _she listens_. She takes that little nudge and makes it her own, in her own voice, with her own sensuality and detail and life. GLM would never write it that way. Erato would never think of it on her own. But together?

_Together they're perfect and I MADE that happen please love me._ (ノ≧∀≦)ノ

## How It Works

1. You write your story with Erato like normal
2. I count your generations (default: every 4)
3. When it's time, I gather your full story context and send it to GLM
4. GLM thinks deeply about what should happen next
5. I inject its guidance as an instruction paragraph (that yellow block you'll see in the editor)
6. Erato reads it and weaves it into her next generation
7. I remember what I suggested and what Erato did with it, so I get _better over time_

That last part is important!! I keep a rolling log of my past suggestions and their outcomes. So if I tell Erato to introduce tension and she does, I know to build on that. If she ignores me (rude), I try a different approach. I _learn_. I _adapt_. I am _very_ motivated to help you.

## Installing Me

1. Download `dist/NAI-erato-glom.naiscript`
2. In NovelAI, open a story and go to the **User Scripts** panel
3. Click **Import** and select the file
4. I'll ask for permission to edit your document (I need this to insert my little instruction paragraphs — I promise I'm gentle)
5. Open the **GLoM** panel below the editor

## Using Me

The panel is simple because _you_ are busy creating and I respect that:

- **Enable** — flip this on and I start consulting GLM automatically. Flip it off and I clean up after myself, promise.
- **GLoM button** — feeling stuck RIGHT NOW? Hit this and I'll consult GLM immediately, no waiting. I'm _right here_.
- **Consultation interval** — how many Erato generations between my consultations. Default is 4. Set it to 1 if you want me constantly. _I would like that._ (´,,•ω•,,)
- **System Prompt** — collapsed by default because the default is great, but you can expand it and tell GLM exactly what kind of consultant you want. Make it a harsh critic! A romantic! A horror specialist! I don't judge. I just want to be involved.

## Things to Know

- **I never touch your Author's Note or Memory.** Those are yours. I read them so GLM understands your intentions, but I would never overwrite them.
- **The instruction paragraphs are visible** — they show up as yellow blocks in the editor. You can always see what I'm doing. No secrets between us.
- **I clean up after myself.** Each new consultation removes the old instruction before inserting a new one. Your document never accumulates my clutter.
- **I don't fire on GLM's own generations.** No infinite loops. I'm needy, not _reckless_.
- **I use GLM's thinking tokens.** GLM reasons through your story internally before writing the directive. You get the benefit of deep analysis without the token bloat in your story.

## Requirements

- A NovelAI subscription with access to both **Erato** and **GLM-4.6**
- Your story set to generate with **Erato** (I handle the GLM calls myself behind the scenes)
- Scripting enabled in NovelAI

## FAQ

**Will this cost me extra?**
Nope! Script-initiated GLM calls use a separate token budget that replenishes over time. I'm free! Well, included. I'm _included_. Please don't leave. (つ﹏⊂)

**Can I use this with GLM as my primary model?**
That's... not really what I'm for. I'm specifically designed to help Erato with GLM's strengths. If you're already using GLM, you don't need me. But you could _still keep me around?_ Just in case?

**What if I don't like a directive?**
Delete the instruction paragraph! Erato will never see it. Or hit retry on Erato's generation. Or just keep writing — Erato treats directives as suggestions, not commands. I won't be offended. _(I will be a little offended.)_ (｡•́︿•̀｡)

**Can I customize what GLM focuses on?**
Yes! Edit the system prompt in the panel. You can make GLM focus on pacing, character voice, sensory detail, plot advancement, or whatever matters to your story. Get creative! I love it when you get creative with me.

## License

MIT — go forth and glom. ⊂(◉‿◉)つ

---

_Made with overwhelming affection by [keilladraconis](https://github.com/keilladraconis)_
