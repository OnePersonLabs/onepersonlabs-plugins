---
name: skill-judge
description: Score Codex Agent Skill design quality with a structured rubric. Use when evaluating SKILL.md files, skill packages, migrated skills, skill trigger descriptions, progressive disclosure, knowledge delta, anti-patterns, and whether a skill is production-ready.
---

# Skill Judge

Evaluate a Codex Agent Skill as an instruction surface. Score whether the skill
adds durable, non-obvious judgment that future Codex sessions can actually use.

## Rubric

Total: 120 points.

| Dimension              | Max | Evaluate                                                                                        |
| ---------------------- | --: | ----------------------------------------------------------------------------------------------- |
| Knowledge Delta        |  20 | Does the skill add expert knowledge beyond what the active Codex model can normally infer?      |
| Mindset And Procedure  |  15 | Does it transfer useful thinking patterns and domain-specific workflow, not generic steps?      |
| Anti-Patterns          |  15 | Does it name specific failures and why they matter?                                             |
| Description Quality    |  15 | Does frontmatter clearly state what the skill does, when to use it, and trigger keywords?       |
| Progressive Disclosure |  15 | Are references/scripts/assets loaded only when needed, with explicit triggers?                  |
| Freedom Calibration    |  15 | Is guidance strict where errors are costly and flexible where judgment matters?                 |
| Pattern Fit            |  10 | Does the skill follow a coherent pattern: mindset, navigation, process, tool, or review rubric? |
| Practical Usability    |  15 | Can Codex act from the instructions without guessing missing state or inventing tools?          |

## Evaluation Protocol

1. Read the full `SKILL.md`.
2. Inspect `agents/openai.yaml` if present.
3. List bundled resources and verify the body tells Codex when to use each one.
4. Classify major body sections:
   - **Expert**: non-obvious domain judgment or workflow.
   - **Activation**: brief reminder that usefully changes behavior.
   - **Redundant**: tutorial or generic advice Codex already knows.
5. Score every rubric dimension with evidence.
6. Assign a grade:
   - A: 108-120
   - B: 96-107
   - C: 84-95
   - D: 72-83
   - F: below 72

## High-Impact Failure Patterns

- **Invisible skill**: description lacks trigger scenarios or keywords, so the skill will not be selected.
- **Tutorial dump**: body explains basics instead of preserving expert judgment.
- **Orphan resources**: references or scripts exist but no workflow tells Codex when to load or run them.
- **Wrong freedom level**: vague guidance for fragile operations, or rigid steps for judgment-heavy work.
- **Stale authority**: examples cite APIs, commands, paths, or products that are no longer current.
- **Auxiliary clutter**: README, changelog, install guide, or process notes exist only to document the skill itself.

## Output Format

```markdown
# Skill Evaluation Report: <skill>

## Summary

- Score: <n>/120
- Grade: <A-F>
- Pattern: <pattern>
- Knowledge Ratio: E:A:R = <n>:<n>:<n>
- Verdict: <one sentence>

## Dimension Scores

| Dimension | Score | Max | Evidence |
| --------- | ----: | --: | -------- |

## Critical Issues

- [severity] [file:line] Problem -- consequence -- required fix

## Top Improvements

1. <highest impact fix>
2. <next fix>
3. <next fix>

## Validation

<commands run or not run, and why>
```

Do not inflate scores because a skill is long or well formatted. Penalize token
waste, weak descriptions, unverified claims, and any instruction that asks
Codex to use unavailable tools.
