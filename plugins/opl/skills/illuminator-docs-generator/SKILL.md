---
name: illuminator-docs-generator
description: Analyze any codebase and create an interlinked, visual, leverage-focused knowledge constellation. Use when the user says "illuminate this", "illuminate this repo", "what can this project do for me", "help me understand this codebase". Also use when the user drops into an unfamiliar repo and wants to quickly understand what it can do and how to leverage it in their projects. This is NOT technical architecture docs -- it's a leverage atlas.
disable-model-invocation: true
---

# Illuminate

Create a **leverage-focused knowledge constellation** -- interlinked markdown documents that help someone quickly understand what a project can do for them and how to use it powerfully.

This is NOT technical documentation. Not architecture diagrams. Not API reference. It's the answer to: **"What is this thing, what can it do for me, and what are the most powerful ways to use it?"**

## Output

If the user specifies a path, use it. Otherwise resolve a disposable output directory before scouting:

1. Test the `.temp/illuminator/` directory itself with `git check-ignore --quiet --no-index` from the project root. A match for one child file is insufficient because every generated descendant must be ignored.
2. If Git confirms that path is ignored, use `.temp/illuminator/`.
3. If it is not ignored or the project is not a Git worktree, create an external directory with `mktemp -d -t illuminator.XXXXXXXX` and use the returned path.

The default output is a disposable snapshot, not project documentation or architectural authority. Record the source revision, generation time, and whether the worktree was clean or dirty in its entry point. After the user or owning task has extracted the useful evidence, delete the snapshot. Preserve it only when the user explicitly chooses a durable destination and accepts responsibility for keeping it current.

---

## Phase 1: Scout (dispatch subagents)

Dispatch 2-3 code-explorer subagents in parallel to rapidly map the codebase from different angles:

1. **Surface scout** -- README, docs, examples, config files. What does this project claim to do? What's the pitch?
2. **Depth scout** -- Entry points, main modules, exports. What are the actual capabilities? What's the most powerful code?
3. **Usage scout** -- Tests, examples, CLI help, commands. How do people actually USE this? What workflows exist?

Each scout writes findings to `<output-directory>/_scratch/scout-{n}.md`.

Use scratch files liberally. Your context window is for orchestrating, not holding every detail you discover.

## Phase 2: Identify Leverage Points

Read scout reports. Identify:

- **Power features** -- Things this project does that would be hard/tedious otherwise
- **Workflow patterns** -- Multi-step sequences that produce valuable outcomes
- **Composition plays** -- How features combine for compound leverage
- **Hidden capabilities** -- Things the project can do that aren't obvious from the README

Rank by **leverage multiplier** -- how much does knowing this amplify what a developer can accomplish?

## Phase 3: Generalize and Critique

Explore up to **3 meta-generalizations** in parallel -- different angles on what would be most valuable to document. Examples (adapt to what you actually discover):

- "Quick-start workflows for common tasks"
- "Power-user patterns for maximum leverage"
- "Integration playbook for using this in other projects"
- "Mental model accelerator for deep understanding"
- "Decision framework for when/how to use which features"

**Adversarially critique each** against these criteria:

| Criterion | Question                                                 |
| --------- | -------------------------------------------------------- |
| Leverage  | Does this increase what a developer can accomplish?      |
| Anti-slop | Is this specific and sharp, not generic filler?          |
| Gap 1     | Does this help the user clarify what they actually want? |
| Gap 2     | Does this help the user convey intent to AI dev agents?  |

Drop the weakest. Pick up a new direction if something better emerges. **Never exceed 3 active threads.** This keeps the constellation tight and high-value rather than sprawling.

## Phase 4: Synthesize (dispatch Opus subagents)

Dispatch subagents (model: opus) to write the final constellation documents. Each subagent gets:

- Relevant scout data from the output directory's `_scratch/`
- The generalization direction it's responsible for
- The output format guidelines

**MANDATORY -- READ ENTIRE FILE**: before writing any constellation document, the synthesis subagent must read [`references/output-format.md`](references/output-format.md) in full (entry-point template, visual language, progressive-disclosure structure, interlinking rules). Pass that file to each subagent.

The orchestrator coordinates but doesn't write final content -- subagents do, preserving your context window for quality control.

## Phase 5: Weave and Polish

Review the constellation as a whole:

- All documents interlinked (every doc links to 2-4 related docs)
- Entry point (README.md) provides a complete visual map
- Progressive disclosure works (skim high-level → drill into detail)
- Delete the output directory's `_scratch/` directory
- One adversarial pass: "Would someone opening this actually find value in under 60 seconds?"

---

## Output Format

The full output-format spec -- entry-point README template, visual language (emoji + mermaid), per-document progressive-disclosure structure, and interlinking rules -- lives in [`references/output-format.md`](references/output-format.md). Load it during Phase 4/5 (see the mandatory trigger above); it is not needed while scouting or ranking leverage.

---

## Quality Criteria

A good constellation lets someone:

| Time   | Achievement                                                   |
| ------ | ------------------------------------------------------------- |
| 30 sec | Understand what the project does and whether it's relevant    |
| 2 min  | Identify the 3-5 most powerful things they could do with it   |
| 10 min | Have a working mental model and know where to find everything |
| 30 min | Be productively using the most powerful features              |

If it doesn't achieve this, it's reference docs wearing a costume. Rewrite.

## Anti-patterns

- Restating the README without adding leverage insight
- Exhaustive API docs (that's what API docs are for)
- Generic descriptions that could apply to any project
- Mermaid diagrams that are just pretty boxes with no insight
- "Progressive disclosure" that's actually just more words at each level
- Listing features without leverage ("it has X" vs "X lets you do Y 10x faster")

## Adaptation

Continuously ask yourself:

- "Am I producing something genuinely useful, or just being thorough?"
- "Would I actually reference this document if I were using this project?"
- "Is this tight, or sprawling into low-value territory?"

Prune aggressively. A 5-doc constellation that's sharp beats a 20-doc one that's comprehensive but diluted.
