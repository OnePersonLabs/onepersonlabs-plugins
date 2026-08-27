---
name: skill-review
description: Audit Codex Agent Skills for correctness, current API claims, structure, bundled-resource consistency, and validation readiness. Use when reviewing or updating `.agents/skills/**`, `~/.codex/skills/**`, imported skill packages, skill metadata, examples, scripts, references, or before publishing/sharing a skill.
disable-model-invocation: true
---

# Skill Review

Audit a skill package as a production instruction surface, not as documentation.
Prioritize facts that can make future Codex sessions do the wrong thing.

## Review Workflow

1. Establish scope:
   - Identify the skill directory, `SKILL.md`, `agents/openai.yaml`, and bundled `references/`, `scripts/`, or `assets/`.
   - If reviewing a repo-local skill, include callers such as hooks, tests, and AGENTS routing that depend on it.
2. Validate structure:
   - `SKILL.md` has only `name` and `description` frontmatter.
   - The folder name matches the skill name.
   - `agents/openai.yaml` matches the current body and trigger intent.
   - Bundled resources are referenced only when the skill tells Codex when to use them.
3. Verify factual claims:
   - For API, CLI, library, or product behavior, check current primary sources or installed source before accepting examples.
   - Confirm imports, flags, package names, file paths, scripts, and command outputs exist.
4. Check instruction quality:
   - Triggering information belongs in `description`, not only the body.
   - The body contains reusable judgment or workflow that Codex would not reliably infer.
   - Delete generic tutorials, migration diaries, and static wording tests that do not protect behavior.
5. Fix unambiguous issues:
   - Correct stale paths, non-existent commands, broken links, invalid examples, and inconsistent metadata.
   - Ask only when multiple product or architecture choices remain viable.
6. Validate:
   - Run `python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py <skill-dir>`.
   - Run any bundled scripts or focused tests that the skill relies on.

## Finding Severity

- **blocker**: invalid frontmatter, wrong skill name, non-existent API/command/import, broken required script, or instruction that blocks correct use.
- **high**: stale major-version guidance, contradictory examples, missing required trigger terms, or bundled references that cannot be discovered from the workflow.
- **medium**: redundant tutorial content, weak anti-patterns, unclear ownership, or outdated minor-version guidance.
- **low**: wording, formatting, or metadata polish that does not affect activation or correctness.

## Output

Lead with findings, ordered by severity. For each finding include:

```markdown
- [severity] [file:line] Problem -- consequence -- required fix
```

Then include:

- validation run and result
- residual risk
- concise change summary if fixes were made
