# Curated TDD Highlander Handoff

## Objective

Continue the user's requested `$opl:skill-review` comparison between:

- `plugins/opl/skills/test-driven-development-curated/`
- `plugins/opl-matt-pocock-skills-engineering/skills/tdd/`

Absorb the Matt skill's useful guidance into OPL's curated TDD skill, remove the
Matt TDD skill and its direct references, then run fresh-context subagent
review/fix cycles until two consecutive reviewers report no issues.

## Repository State

- Repository: `/home/zethj/dev/onepersonlabs-plugins`
- Branch: `main`
- The worktree was clean at the last check.
- No TDD synthesis or deletion mutations were made in the interrupted session.
- `.temp/` is ignored by the root `.gitignore`; this handoff is intentionally
  untracked.
- Prior completed work is commit `b8f7533` (`Add curated TDD and Superpowers
  lite plugins`), already pushed and installed.

## Mandatory Startup

Projector is a separate project being developed concurrently. It was
inadvertently activated in the prior session and has no role in this repository
or task. Do not invoke Projector, wait for Projector evidence, or treat Projector
as a prerequisite or blocker.

In the fresh session:

1. Read and follow `$opl:skill-review`, skill-creator, writing-for-agents, and
   the repository's applicable `AGENTS.md` instructions.
2. Recheck `git status --short` before editing.
3. Proceed directly with the TDD comparison and synthesis workflow below.

## Comparison Already Established

The curated skill already covers meaningful RED evidence, stack/test-surface
discovery, safe brownfield handling, realistic confidence boundaries,
independent expectations, deliberate doubles, deterministic tests, refactoring,
and completion evidence.

Useful Matt guidance to synthesize without duplication:

- Read project domain vocabulary such as `CONTEXT.md` and respect relevant ADRs.
- Prefer public interfaces and name scenarios as caller-visible capabilities.
- Work in vertical tracer-bullet slices; avoid writing all tests before all
  implementation.
- Treat test friction as interface/seam design feedback.
- Prefer specific typed boundary interfaces over generic conditional fetchers or
  mocks when introducing a production seam is warranted.

Do not absorb these Matt weaknesses:

- Mandatory user confirmation before every test seam. Discover and choose the
  narrowest meaningful boundary autonomously unless the choice materially
  changes scope or contract.
- Moving refactoring outside the red-green-refactor loop. Keep the curated
  refactor phase while behavior stays green.
- Absolutes such as never mocking anything controlled or exactly one test per
  slice. Preserve risk-based judgment.
- TypeScript-heavy tutorial examples or generic TDD exposition that bloats the
  operational skill.

## Files Inspected

Curated package:

- `plugins/opl/skills/test-driven-development-curated/SKILL.md`
- `plugins/opl/skills/test-driven-development-curated/agents/openai.yaml`
- `plugins/opl/skills/test-driven-development-curated/references/test-quality.md`

Matt package:

- `plugins/opl-matt-pocock-skills-engineering/skills/tdd/SKILL.md`
- `plugins/opl-matt-pocock-skills-engineering/skills/tdd/agents/openai.yaml`
- `plugins/opl-matt-pocock-skills-engineering/skills/tdd/mocking.md`
- `plugins/opl-matt-pocock-skills-engineering/skills/tdd/tests.md`

Direct Matt callers/references found:

- `plugins/opl-matt-pocock-skills-engineering/skills/README.md`
- `plugins/opl-matt-pocock-skills-engineering/skills/ask-matt/SKILL.md`
- `plugins/opl-matt-pocock-skills-engineering/skills/implement/SKILL.md`

The OPL rationale is at `plugins/opl/README.md`. Existing conflict-warning hook
files are:

- `plugins/opl/scripts/codex-tdd-skill-conflict-warning-hook.py`
- `plugins/opl/scripts/codex-tdd-skill-conflict-warning-hook.test.mjs`

## Intended Change Boundary

1. Improve the curated skill concisely, likely in `SKILL.md` and/or
   `references/test-quality.md`; update `agents/openai.yaml` only if the trigger
   or prompt genuinely improves.
2. Optionally add a short Matt-specific rationale to `plugins/opl/README.md` if
   it helps explain the consolidation without becoming a migration diary.
3. Delete the exact four files under
   `plugins/opl-matt-pocock-skills-engineering/skills/tdd/` with `apply_patch`.
4. Remove the Matt TDD entry from that plugin's skills README and retarget or
   remove `/tdd` references in `ask-matt` and `implement`. Prefer an explicit
   reference to OPL's curated skill where the flow still needs TDD.
5. Search the full repository for stale direct references before completion.

Do not delete the whole Matt engineering plugin; only its TDD skill and direct
callers are in scope.

## Review and Verification Loop

After local validation, spawn one oblivious reviewer at a time with no inherited
conversation (`fork_turns: "none"`). Ask it to inspect only the final curated
skill package with `$opl:skill-review`, make no edits, report all severities, and
return exactly `NO ISSUES FOUND` when clean.

- Fix every valid finding locally.
- Reset the clean streak to zero after any finding.
- Continue until two consecutive fresh reviewers return no issues.

Then run:

- the skill validator from the skill-creator package against the curated skill;
- relevant OPL hook tests if hook/rationale behavior changed;
- repository-wide stale-reference searches;
- `git diff --check` and a final `git status --short`/diff review.

The current request did not explicitly repeat commit, push, or install. Do not
perform those external lifecycle steps unless the fresh session determines the
user's "do the same" clearly carries that prior authorization or the user asks.

## Communication

The user wants execution, not another approval round. Proceed without asking
unless a real in-scope dependency blocks the work. Report the absorbed strengths,
removed Matt files/references, validation evidence, two clean oblivious review
passes, and any remaining uncommitted state.
