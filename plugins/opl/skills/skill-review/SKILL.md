---
name: skill-review
description: Use when auditing, scoring, grading, comparing, fixing, or preparing Codex Agent Skills for publication, including SKILL.md, agents/openai.yaml, bundled resources, and repo-local callers.
---

# Skill Review

Treat a skill package as a production instruction surface. Prioritize defects
that can make future Codex sessions select the wrong skill or take the wrong
action.

## Select the Review Mode

- **Audit** is the default. Inspect and report without editing.
- **Update** applies only when the user asks to create, change, or fix the
  skill. Correct unambiguous issues, then review the resulting package.
- **Score** applies when the user asks for a score, grade, comparison, or
  quantitative readiness assessment. Read
  [references/scoring-rubric.md](references/scoring-rubric.md) before scoring.

For a combined update and score request, update first and score the final
package.

## Review Workflow

1. Establish scope:
   - Identify `SKILL.md`, `agents/openai.yaml`, and bundled `references/`,
     `scripts/`, or `assets/`.
   - For a repo-local skill, include callers such as hooks, tests, and AGENTS
     routing.
2. Validate structure:
   - Frontmatter contains the required `name` and `description` and only
     supported optional fields.
   - The folder name matches the skill name.
   - `agents/openai.yaml` matches the trigger intent and current body.
   - Every bundled resource has an explicit condition that tells Codex when to
     load or run it.
3. Verify factual claims:
   - Check API, CLI, library, and product claims against current primary
     sources or installed source.
   - Confirm that referenced imports, flags, packages, paths, scripts, and
     commands exist.
4. Check instruction quality:
   - Triggering information is present in `description`, not only the body.
   - The body adds durable judgment or workflow Codex would not reliably infer.
   - Freedom is strict where mistakes are costly and flexible where judgment
     matters.
   - Remove generic tutorials, migration diaries, auxiliary process notes, and
     static wording tests that do not protect behavior.
5. Complete the selected mode:
   - Audit: report findings without modifying files.
   - Update: fix unambiguous findings within the user's authorized scope.
   - Score: apply every dimension in the scoring rubric with file evidence.
6. Validate:
   - Run `python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py <skill-dir>`.
   - Run bundled scripts and focused tests on which the skill relies.

## High-Impact Failure Patterns

- **Invisible skill**: the description omits the situations or keywords that
  should activate it.
- **Tutorial dump**: the body teaches basics instead of preserving expert
  judgment.
- **Orphan resource**: a bundled file exists without a workflow condition for
  loading or running it.
- **Wrong freedom level**: fragile work gets vague guidance, or judgment-heavy
  work gets rigid steps.
- **Stale authority**: examples depend on obsolete APIs, commands, paths, or
  products.
- **Auxiliary clutter**: package files document the skill's own history or
  installation without changing agent behavior.

## Finding Severity

- **blocker**: invalid frontmatter, wrong skill name, non-existent
  API/command/import, broken required script, or an instruction that blocks
  correct use.
- **high**: stale major-version guidance, contradictory examples, missing
  required triggers, undiscoverable resources, or instructions that exceed
  user authorization.
- **medium**: redundant tutorial content, weak anti-patterns, unclear
  ownership, poor freedom calibration, or outdated minor-version guidance.
- **low**: wording, formatting, or metadata polish that does not affect
  activation or correctness.

## Output

For audit and update modes, lead with findings ordered by severity:

```markdown
- [severity] [file:line] Problem -- consequence -- required fix
```

Then include validation results, residual risk, and a concise change summary
when files changed. If there are no findings, state that explicitly.

For score mode, use the report contract in
[references/scoring-rubric.md](references/scoring-rubric.md).
