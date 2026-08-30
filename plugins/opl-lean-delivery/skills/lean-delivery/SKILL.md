---
name: lean-delivery
description: Coordinate substantial implementation delivery, multi-phase or DAG work, and active review-fix loops with compact acceptance context, continuity review, bounded repair, and proportionate verification. Use for cross-cutting or long-running changes where repeated context loading and review churn are material; do not use for narrow edits, planning-only work, or standalone review.
disable-model-invocation: false
---

# Lean Delivery

Ship acceptance-backed behavior without repeatedly paying to rediscover the same
domain or reopening settled review scope. Preserve the user's requested outcome,
permissions, repository instructions, and ownership boundaries.

## Resolve repository policy

At the start of an implementation or review-repair delivery, resolve the Git
root and run the bundled `scripts/read_config.py --repo <path>` from this skill
directory. The script is the authority for configuration syntax and validity.

If the user invokes `$lean-delivery configure`, or the reader reports `absent`,
`incomplete`, or `invalid`, read [references/configuration.md](references/configuration.md).
Finish safe work that does not depend on a missing setting, then ask before
crossing the affected boundary. Do not infer authority from absence or invalid
configuration.

Repository policy controls how authorized work is carried out. It cannot turn a
planning, review-only, diagnosis-only, or otherwise read-only request into
permission to edit, delegate, create worktrees, or commit.

## Build the delivery capsule

Read the task source, relevant repository instructions, existing seams, and only
the authoritative material needed for the current phase. Keep a compact capsule
containing:

- owned files and package boundaries;
- existing interfaces to reuse;
- caller-visible acceptance behaviors;
- material authority, persistence, and trust boundaries;
- focused checks and the repository's full gate.

Keep the capsule in conversation unless durable handoff or repository workflow
requires an artifact. Reference local sources instead of copying large specs,
diffs, or logs into prompts and reports.

Split large work into coherent vertical slices with explicit ownership and join
contracts. Prefer one continuity implementor across related slices. Under
`delegation.mode = "adaptive"`, delegate only when independent work or review
will repay its context cost; `always` requires a continuity implementor and a
separate reviewer when delegation exists, while `never` keeps the work in the
current agent. Reuse the same reviewer through repair closure. A reviewer that
edits production work is no longer independent.

## Freeze the material acceptance matrix

Before production edits, state the supported-path behaviors whose failure would
change a real outcome. Cover the applicable happy path and fallback, stale and
current state, missing or conflicting input, authority boundaries, deterministic
identity or persistence, failure before mutation, and public composition path.

A review finding blocks delivery only when all three are present:

1. a direct normative or agreed acceptance requirement;
2. a runnable reproduction through a supported path;
3. a material consequence such as wrong output, stale authorization, data loss,
   corruption acceptance, boundary escape, or required workflow failure.

Keep style, speculative hardening, impossible internal misuse, and low-impact
overconstraint as nonblocking residuals. Before implementation, let the
continuity reviewer challenge the matrix once when an independent reviewer is
available; batch missing sibling cases before edits.

## Implement and verify

For executable behavior needing regression protection, establish a meaningful
failing test, implement the coherent invariant, and keep focused tests green.
Do not force a RED step for prose, mechanical metadata, or behavior already
correct before this task.

Run focused checks while iterating. Apply `verification.full_gate` as follows:

- `pre-review-and-closure`: run the repository gate before comprehensive review
  and again after repair closure;
- `closure-only`: defer the repository gate until closure while continuing all
  focused and affected-package checks during implementation.

Perform one comprehensive review against the frozen matrix and exact change
boundary. Consolidate all material findings into one repair batch. The same
implementor fixes that batch and the same reviewer performs targeted closure.
Repeat only for a newly demonstrated material blocker, up to
`review.max_repair_cycles`. At the configured limit, report the unresolved
blocker instead of silently widening the loop.

## Apply Git policy

Use `git.worktree` only for authorized implementation work:

- `adaptive`: create one when isolation or parallel ownership materially helps;
- `always`: create one when Git and repository policy permit it;
- `never`: work in the current checkout.

Commit only verified, task-owned changes at coherent implementation or repair
checkpoints:

- `git.commit = "auto"`: commit without another prompt when the boundary is
  safe;
- `ask`: ask at each commit checkpoint;
- `never`: leave changes uncommitted unless the user explicitly requests a
  commit for the current task.

Never push as part of this skill. Never stage or commit unrelated changes.
Apply `git.dirty_worktree` when unrelated changes exist:

- `ask-on-conflict`: ask when unrelated staging, overlapping ownership, or
  dependence on uncommitted work makes the commit boundary uncertain;
- `path-only`: use an explicit task-owned pathspec while preserving unrelated
  index entries;
- `require-clean`: do not auto-commit until the worktree is clean.

## Complete

Complete when the agreed matrix passes, supported public paths are wired, the
configured verification gate passes, and no material blocker remains. Record
decisions, commands, commit identifiers, failures, and residuals compactly.
Do not reopen broad review scope or seek an abstract proof that no further bug
can exist.
