---
name: instruction-surface-review
description: Review or author agent instruction surfaces. Use when creating, editing, or reviewing AGENTS.md, AGENTS.override.md, .agents/references/*.md, .agents/skills/**/SKILL.md, agents/openai.yaml, Codex hooks/rules/config guidance, or any durable instruction meant to change agent behavior.
---

# Instruction Surface Review

Prevent instruction bloat. Pick the smallest surface that changes future behavior, then delete or consolidate stale guidance before adding new text.

## Source Routing

- `AGENTS.md`: always-loaded repo guidance. Keep practical: commands, conventions, constraints, verification, and routing to deeper surfaces.
- `.agents/references/*.md`: repo-local workflow/routing guidance. Use one file per concern.
- `SKILL.md`: reusable semantic workflow. For creating or updating skills, use `$skill-creator`.
- `agents/openai.yaml`: app metadata and optional invocation policy/dependencies only.
- Hooks, validators, and scripts: use for mechanically checkable behavior. Do not mirror their path patterns or internals in prose.

## Evidence Pass

Before editing:

1. Read the target file and the nearest owner of the behavior: hook, validator, script, spec, existing skill, or nested `AGENTS.md`.
2. Search for duplicated or stale guidance with `rg` before adding another rule.
3. For Codex product claims, use `$openai-docs` or current official Codex docs before relying on memory.
4. For skill format claims, prefer the current Codex skills docs and the Agent Skills specification.

## Edit Rules

- Replace the bad instruction; do not add a counterweight beside it.
- If the behavior is repeated and semantic, create or update a focused skill instead of expanding `AGENTS.md`.
- If the behavior is deterministic, prefer a hook, validator, or script over prose.
- If an instruction only says "be careful", delete or replace it with a concrete check, command, or owner pointer.
- If a section mixes unrelated concerns, split by surface or delete the part whose source of truth lives elsewhere.
- Keep historical rationale out of durable instructions. State current behavior only.

## Size Budgets

Treat these as defaults, not goals:

- Root `AGENTS.md`: under 200 lines.
- `.agents/references/*.md`: under 200 lines per concern.
- `SKILL.md` body: under 150 lines unless references/scripts would make the workflow harder to follow.
- `<skill-dir>/agents/openai.yaml`: minimal `interface` fields unless a real dependency or invocation policy is needed.

If a file must exceed the budget, state why in the final answer and show what was moved out or deleted first.

## Review Gate

Reject the change until all are true:

- The target surface is the right scope for the behavior.
- There is one source of truth; duplicated prose was deleted or replaced by a pointer.
- The instruction tells the agent what to do, when to do it, and what evidence proves it.
- The wording is imperative, concrete, and current-state only.
- The diff does not add broad philosophy, motivational prose, migration diary, or static tests for wording.
- `git --no-pager diff --check -- <changed-files>` passes.

For skill changes, also run:

```bash
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py <skill-dir>
```
