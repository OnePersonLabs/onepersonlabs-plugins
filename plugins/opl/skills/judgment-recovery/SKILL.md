---
name: judgment-recovery
description: >
  Use when the user invokes "$judgment-recovery" or when an agent failure has already happened:
  robotic compliance, cargo-cult process, overproduction around a removal, missed requested
  research, ignored rules, sycophantic reversal, or repeated user correction. Re-ground the
  work, refine a comprehension blurb through bounded dream passes, run targeted web searches when
  they could change the conclusion, then prefer deletion, consolidation, or enforceable gates before
  adding prose.
---

# Judgment Recovery

Use this skill after a reasoning or process failure is observed. This is not the normal path for every task; it is the recovery path when the agent has already shown that ordinary instruction-following is not enough.

## Core Premise

The failure is usually not "missing a rule." The failure is the agent substituting visible instruction compliance for grounded judgment, then repairing with more text. Recovery must restore understanding first, then change the smallest durable surface that actually prevents recurrence.

## Step 1: Name The Failure

Write a terse failure statement grounded in observable facts:

- What the agent did.
- What the user requested or the repo required instead.
- Which category applies: robotic compliance, cargo-cult process, local optimization, missed research, missed rules, stale bureaucracy, sycophantic agreement, or overproduction.

Classify each premise as observed repo fact, session fact, inference, assumption, or user preference. Verify discoverable facts before agreeing with the premise.

## Step 2: Re-Ground In Evidence

Read only the relevant sources, but actually read them:

- Session history from the failure point forward.
- Top-level `AGENTS.md`.
- Relevant OpenSpec main specs, active deltas, proposal/design/tasks, and changed files.
- Existing hooks, validators, tests, or skills that already own the behavior.

Do not claim that you reviewed a surface unless you can name what it changed in your understanding.

## Step 3: Dream The Comprehension Blurb

Create a short "understanding blurb" that explains the real problem, the desired behavior, and the implied cleanup/refactor. Then iterate:

1. Re-read the most relevant evidence against the blurb.
2. Improve the blurb if the evidence exposes a sharper model.
3. Explicitly ask: "Is there a high-leverage web search that could change this model?"
4. If yes, run that search and fold in the result.
5. If no, say why local evidence is sufficient for this pass.

Stop after two consecutive passes yield negligible improvement. Do not loop for theater.

## Step 4: Review Before Prescribing

Run or apply `$adversarial-review` to the current understanding and any proposed refactor. The review must look for:

- New prose that counterweights an old bad rule instead of replacing it.
- Duplicate pointer files or scattered instructions that should be consolidated.
- Validators that mirror dead process text.
- Tests that assert static wording without protecting behavior.
- OpenSpec artifacts that retain stale rationale or exclusions.
- A proposed route that satisfies a local task while worsening the system.

Fix FAIL items before proceeding. Treat WARN items as judgment calls; decide them explicitly.

## Step 5: Choose The Intervention

Prefer interventions in this order:

1. Delete stale artifacts.
2. Rewrite or consolidate the vulnerable existing instruction.
3. Add or update a deterministic hook, validator, or workflow gate when the behavior is structurally checkable.
4. Add a focused skill when the behavior needs semantic judgment.
5. Add prose-only guidance only after explicit user decision.

If an artifact only exists because another stale artifact exists, remove both sides of the local patch instead of keeping the ban.

## Step 6: Apply And Close The Loop

When the user asked for implementation, do not stop at a proposal:

- Update OpenSpec artifacts if the recovery loop changed the intended behavior.
- Apply the change.
- For OpenSpec-backed cleanup that changes main specs, sync and archive when implementation and review are clean unless the user explicitly asked to keep the change active.
- Remove temporary or stale files needed only for the failed route.
- Validate with the repo's relevant commands.
- Re-run `$adversarial-review` after the diff exists.
- Repeat the recovery loop only while it produces material improvements.

The final answer should state the durable behavior now in place, the cleanup performed, and any validation that could not be run.
