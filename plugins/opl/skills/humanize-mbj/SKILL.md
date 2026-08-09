---
name: humanize-mbj
description: Rewrite AI-assisted or overly polished prose into writing that preserves the author's intent, voice, asymmetry, specificity, and natural variation. Use for interview answers, emails, essays, posts, documentation, scripts, and any draft that feels generic, flattened, over-structured, or recognizably machine-shaped.
---

# Humanize Prose

## Purpose

Transform prose that is fluent but generic into prose that sounds like a particular human meant it.

The goal is not to add fake mistakes, slang, or randomness. The goal is to recover authorship: a visible point of view, selective emphasis, concrete reasoning, irregular but controlled rhythm, and choices that follow the writer's actual intent rather than the statistical center of "good writing."

Preserve meaning. Preserve factual claims. Preserve the author's level of technical precision. Do not make the writing dumber, noisier, or less useful.

## Core model

AI-shaped prose often converges toward a narrow stylistic center:

- uniformly polished sentences
- predictable paragraph lengths
- overly balanced clauses
- abstract nouns replacing direct actions
- repeated rhetorical templates
- generic transitions
- exhaustive completeness where selective emphasis would be stronger
- symmetrical lists, especially threes
- excessive summary and restatement
- safe, context-free observations
- a single unbroken register
- narrative or argumentative choices that resemble the most probable version of the task

Human writing is not merely "more casual." It is more selective, situated, and idiosyncratic. A human writer notices some things and ignores others. They compress what feels obvious, expand what matters to them, break patterns, make local jokes, use examples from experience, and let sentence rhythm follow thought rather than a template.

## Inputs

The user may provide:

- a draft to rewrite
- a target voice or samples of their writing
- the intended audience
- the purpose of the text
- constraints such as length, formality, vocabulary, or punctuation
- phrases or habits to avoid

When voice samples are available, treat them as the primary style specification. Do not replace the author's quirks with generic "human" quirks.

## Workflow

### 1. Lock the semantic payload

Before rewriting, identify:

- the actual claim or request
- the strongest idea
- concrete evidence or examples
- required facts, caveats, and constraints
- the emotional posture
- what the author is trying to make the reader think, feel, or do

Do not edit until this is clear.

### 2. Diagnose the machine shape

Inspect the draft for these patterns:

#### Uniformity
- similar sentence lengths
- every paragraph following the same cadence
- consistent formality with no local variation
- every point receiving equal weight

#### Template rhetoric
- "It's not just X, it's Y"
- "At its core"
- "In today's rapidly evolving"
- "This is where X comes in"
- "The key is"
- "Ultimately"
- "By doing so"
- mirrored contrasts repeated across paragraphs
- setup, list of three, summary, repeated until the reader expires of natural causes

#### Nominalized or indirect language
- "the implementation of"
- "the optimization of"
- "the facilitation of"
- "there is a need to"
- "it is important to note"

Prefer actors and verbs when they make the thought clearer.

#### Generic completeness
- covering every reasonable point instead of selecting the important ones
- explaining obvious implications
- ending with a recap that adds nothing
- offering vague benefits without mechanism

#### Synthetic emphasis
- constant intensifiers
- unnecessary bold claims
- dramatic framing unsupported by the content
- aphorisms that could belong to anyone

#### Surface-level tells
These are weak evidence individually, but repeated use flattens voice:
- em dashes
- semicolon-heavy cadence
- excessive colons
- tidy triads
- "delve," "tapestry," "landscape," "nuanced," "robust," "seamless"
- repeated participial openers such as "By doing X..."
- perfectly balanced sentence pairs

Do not ban common constructions blindly. Remove them when they are habitual rather than chosen.

### 3. Recover the author's center of gravity

Ask internally:

- What would this writer notice first?
- Which detail would they bother making concrete?
- Where would they compress because the audience can keep up?
- Where would they stop being diplomatic?
- What phrase sounds native to this person rather than generally competent?
- Is there a useful asymmetry, surprise, dry joke, or sharp example already latent in the idea?

Use the author's actual vocabulary. Do not manufacture a costume.

### 4. Rewrite from thought, not sentence substitution

Do not mechanically paraphrase sentence by sentence.

Reconstruct the passage from the semantic payload:

- lead with the real point
- order ideas by causal or persuasive importance
- vary sentence length according to thought
- let some sentences be blunt
- let one detail carry more weight than three abstractions
- use transitions only where the reader actually needs one
- permit a paragraph to end without summarizing itself
- choose one strong example over a catalog of weak examples
- preserve useful technical language, but remove ceremonial vocabulary

### 5. Add controlled human variation

Use variation with intent:

- mix short, medium, and occasional long sentences
- vary paragraph length
- alternate direct claims with concrete examples
- use contractions where natural
- use fragments rarely and only when they sharpen rhythm
- allow parenthetical thoughts when they reflect the author's mind
- use humor only when it belongs to the writer and situation
- permit slight asymmetry in lists
- avoid polishing every edge into the same corporate pebble

Never add typos, fake uncertainty, random slang, or grammatical errors merely to appear human.

### 6. Test the result

Run these checks:

#### Voice test
Could this plausibly have been written by the specified author, or only by "a competent person"?

#### Specificity test
Does the passage contain at least one concrete mechanism, consequence, example, observation, or choice where the original idea supports one?

#### Compression test
Can any sentence be removed without loss? Remove it.

#### Rhythm test
Read it aloud. If every sentence lands with the same weight or shape, revise.

#### Intent test
Did the rewrite make the author more generic, more polite, more formal, or more certain than intended? Undo that drift.

#### Skeleton test
Look only at paragraph functions. If the structure is repeatedly:
1. topic sentence
2. three supporting points
3. summary sentence

break the pattern.

#### Cliche test
Replace phrases that could be pasted into 500 unrelated answers.

#### Truth test
Do not introduce experiences, opinions, facts, or emotional states the author did not supply.

## Output rules

Unless the user asks for analysis:

- return the rewritten text first
- keep commentary brief
- do not explain every edit
- do not claim the text is "undetectable"
- do not optimize for AI detectors
- do not add fake flaws
- do not erase domain vocabulary that a real expert would naturally use
- do not overcorrect into choppy, aggressively casual prose
- do not use em dashes when the author does not use them

When useful, provide one alternate version with a distinct posture, such as:
- sharper
- warmer
- more technical
- more conversational
- more concise

Do not provide five near-identical options. That is just indecision wearing a dropdown menu.

## Style priorities

Apply these in order:

1. Author intent
2. Factual fidelity
3. Author voice
4. Reader comprehension
5. Compression
6. Rhythm and texture
7. Conventional polish

Conventional polish is last because it is the easiest thing for a model to overproduce.

## Anti-patterns

### Fake casualization

Bad:
> Honestly, this is super important because, like, systems can totally break in unexpected ways.

Why it fails:
It swaps generic formal prose for generic casual prose.

Better:
> By "break," I do not just mean a bug reaching production. I mean discovering that rollback is impossible after both server and client data have already migrated.

### Synonym roulette

Bad:
> I prioritize crafting systems that remain comprehensible, adaptable, and resilient.

Why it fails:
It changes words without changing the statistical shape.

Better:
> I want the system easy to understand, easy to change, and hard to accidentally destroy.

### Decorative specificity

Bad:
> At 2:17 a.m., under the pale glow of a monitor...

Why it fails:
It invents cinematic detail instead of recovering genuine authorship.

Better:
Use real detail supplied by the author, or stay direct.

### Forced sentence chaos

Bad:
> Systems fail. Often. Weirdly. And then? Trouble.

Why it fails:
Choppiness is not personality.

Better:
Vary rhythm according to emphasis, not by rolling punctuation dice.

### Universal em dash purge

Bad:
Blindly replacing every em dash regardless of author preference.

Why it fails:
Any punctuation mark can be human. Repetition and default use are the problem.

Better:
Honor the author's observed habits. For authors who do not use em dashes, remove them.

### Corporate deodorizing

Bad:
> I leverage proactive architectural strategies to facilitate scalable outcomes.

Better:
> I design around the parts most likely to change, then isolate them so they can change without dragging the whole system with them.

## Example

### Input

> When designing scalable systems, I focus on maintainability, modularity, observability, and robust error handling. It is important to create clear abstractions and ensure that the system can evolve as requirements change. Ultimately, a well-designed system should empower teams to move quickly while maintaining reliability.

### Weak rewrite

> I care about systems that are clean, modular, observable, and resilient. The key is to build clear abstractions so the architecture can evolve with changing requirements. At the end of the day, good design helps teams move fast without sacrificing reliability.

This is shorter, but it retains the same generic skeleton.

### Strong rewrite

> I start with change and failure. What is most likely to change, what can fail independently, and what would make recovery impossible? Then I put boundaries around those things. Good architecture should let a team make one change without needing a séance to discover what else it broke.

The second version has selective emphasis, causal structure, a point of view, and a specific mental model.

## Acceptance criteria

A successful rewrite:

- preserves every important claim
- sounds like a particular author, not a general writing assistant
- uses concrete mechanisms where available
- contains meaningful variation in sentence and paragraph shape
- avoids repetitive rhetorical templates
- removes redundant framing and summary
- prefers direct verbs over unnecessary nominalizations
- does not invent biography, facts, or emotion
- does not rely on fake mistakes or random slang
- does not merely swap vocabulary
- remains appropriate for the audience and purpose
- is shorter when the extra length was only scaffolding
- feels authored rather than generated

## Optional author profile

When repeated work for one author is expected, maintain a compact profile:

```yaml
voice:
  formality: conversational-expert
  compression: high
  humor: dry, sparse, surprise-based
  sentence_rhythm: irregular but controlled
  preferred_moves:
    - first-principles framing
    - concrete failure cases
    - direct verbs
    - sharp final line
  avoid:
    - em dashes
    - generic encouragement
    - corporate abstractions
    - tidy rhetorical triads
    - explaining what the audience already knows
```

Update the profile only from observed writing or explicit user preferences. Do not infer a caricature from one sample.
