# Durable campaign state

Use for campaigns that may span agents or contexts, and read first when resuming
one. Durable files are the working memory; conversation is a cache of the current
decision. Keep source evidence retrievable without requiring a transcript.

## Establish a landing file

Use the repository's existing durable work area. If none exists, choose a
workspace-local campaign directory such as `.borg/<campaign>/` and state its
absolute path. Keep it outside installed plugin/runtime directories and areas
automatically cleaned between sessions. Do not commit it or alter ignore rules
merely to create it. Reuse an existing campaign instead of creating competing
records. Record cross-workspace paths explicitly.

Start with `STATE.md` and a few linked tables. Split growing tables into indexed
files by source, capability family, or workstream; do not impose a file per fact.
The following are information responsibilities, not a mandatory empty scaffold:

| Record | Required information |
| --- | --- |
| `STATE.md` | Mission, authorized endpoint, constraints, active scope, current phase, coordinator/generation, active work IDs, blockers, next actions, links to indexes and current handoff |
| Source/coverage index | Stable source ID, origin, pinned revision/fingerprint, local location, reuse evidence; inventory units with inspected/excluded/unread status and finding links |
| Capability records | Stable capability IDs, value/mechanism/dependencies/distinctiveness/survival test, evidence locations, uncertainty, disposition, native owner, linked decisions and proof |
| Decision records | Decision ID, conflicting choices, concrete differentiating case, rationale, affected capabilities/interfaces, superseding decision if revised |
| Work index and packets | Work ID, dependency IDs, scope, read set, exclusive write ownership, assigned agent and generation, expected result/checks, status, result location |
| Verification receipts | Capability/work IDs, exact command or trial, environment and relevant source/target state, expected/observed result, exit/pass/fail status, bounded evidence location, limitations |
| `HANDOFF.md` | Current checkpoint, authoritative reading order, interrupted work disposition, exact next action, and recovery instructions |

Use IDs in summaries and links rather than repeatedly pasting records. Preserve
source path plus symbol/section and revision, not line numbers alone. Store raw
logs and experiments separately with bounded excerpts. Do not place secrets in
packets or receipts.

## Keep the active view small

`STATE.md` should fit in a short read: summarize only the mission, frontier,
material decisions, active work, and the next executable action. Move completed
work and detailed evidence behind links. A successor reads the landing file and
relevant slice, not every historical packet.

The coordinator alone updates shared indexes and accepted decisions. Workers
write to assigned result files and owned implementation paths. Publish detailed
records first, then update the landing file to point to the coherent checkpoint.
Use a monotonically increasing checkpoint/generation label to expose stale
packets. This label documents ownership; it is not a lock that stops a worker.

Keep distinct facts distinct:

- Inspection coverage does not imply adoption.
- A design decision does not imply implementation.
- Implementation does not imply verification.
- A worker's test receipt does not imply acceptance on the integrated target.

For work, a useful lifecycle is `pending -> active -> implemented -> verified ->
accepted`, with explicit `blocked` and `superseded` states. Research work can be
accepted based on its bounded evidence deliverable without pretending code was
implemented. Record dependencies and the evidence required for each transition.
After integration changes relevant files, invalidate affected verification
receipts and reopen dependent work; avoid rerunning unaffected checks.

## Checkpoint while there is still room

Update durable state after an accepted research batch, a consequential decision,
an integrated slice, a failed check that changes the plan, or new user steering.
Prepare a baton pass before a large new phase or when the active frame is growing
hard to reason about. Do not rely on a context-limit warning or exact remaining
token count being available.

A checkpoint identifies the recipient revision plus relevant uncommitted changes,
donor revisions, accepted results, unresolved claims, and active owners. A commit
is optional; a base revision alone does not identify a dirty worktree. Capture a
scoped diff or content fingerprints when needed to distinguish the actual state.
Preserve unrelated user work and describe it only as needed for safe continuation.

## Recover from a handoff or interruption

1. Read `STATE.md`, the current `HANDOFF.md` if present, and applicable recipient
   instructions. Recover the original endpoint and later user corrections.
2. Verify the workspace, source identities, relevant target state, and referenced
   artifacts. If a source or interface changed, invalidate only affected findings,
   decisions, and dependent proof; record what must be checked again.
3. Reconcile active agents/processes and their owned files. Check actual output
   before replaying an interrupted command: a tool may have changed state before
   its receipt was written. Inspect migrations and external effects through their
   supported status/read paths before attempting them again.
4. Read the next work packet, its dependency decisions, and necessary evidence.
   Reuse accepted findings unless missing, stale, contradictory, or insufficient
   for this decision. Do not redo the donor survey to reconstruct confidence.
5. Establish the current coordinator/generation and resume the first ready task.
   If records disagree with the files, reconcile that narrow discrepancy before
   marking dependent work accepted.

If the ledger was lost, reconstruct a minimal landing file from actual artifacts
and receipts, label uncertain state, and continue safe work. Never fabricate
completed research or verification to fill a gap.
