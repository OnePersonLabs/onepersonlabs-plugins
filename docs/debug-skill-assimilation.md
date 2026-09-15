# Debug skill assimilation

`opl` owns the canonical `$debug` workflow. It replaces `$diagnosing-bugs` in
OPL Matt Pocock Skills and `$systematic-debugging` in OPL Superpowers Lite.
The replacement preserves causal investigation and exact-symptom verification,
adds optional practical techniques, and composes executable fixes with OPL's
existing `$test-driven-development` owner.

## Sources and scope

The source revision is `b4aa8f451c5e60860318063b6827d5ddff3fe476` in
`OnePersonLabs/onepersonlabs-plugins`. These are the repository's adapted skills,
not an assessment of current upstream releases.

| Source at that revision | Inspected surfaces | Disposition |
| --- | --- | --- |
| `plugins/opl-superpowers-lite/skills/systematic-debugging/` | Entrypoint and invocation metadata | Causal loop, scope boundaries, and evidence standards reexpressed in `$debug`; old entrypoint retired |
| `plugins/opl-matt-pocock-skills/skills/diagnosing-bugs/` | Entrypoint, invocation metadata, and human-assisted Bash template | Useful reproduction and performance techniques retained; rigid gates and generic template retired |
| `plugins/opl/skills/test-driven-development/` | Entrypoint and regression/test-quality ownership | Existing owner reused; no competing TDD workflow created |
| `plugins/opl-borg/skills/assimilate/` | Entrypoint and prior independent gap review | Used to guide assimilation; recommendations below, no changes to Borg |

Both donor plugin manifests declare MIT. The Matt bundle credits Matt Pocock's
skills; Superpowers Lite carries the Superpowers debugging discipline. This
replacement rewrites the selected instructional mechanisms and ships no copied
donor executable. The old donor bodies and metadata remain recoverable from the
source revision; a local pre-removal content inventory was also recorded under
`.work/assimilations/debug/`.

## Capability decisions and proof

| Capability or conflict | Native decision | Observable proof |
| --- | --- | --- |
| Causal evidence before patching | `$debug` traces divergence, tests a falsifiable explanation, and reconciles counterexamples | Catalog trial moves the failure by reversing account order and identifies the incomplete cache identity |
| Exact symptom and realistic test seam | Exercise the actual interaction, preserve the original scenario, verify it after fixing | New two-account regression fails before the fix, passes afterward, and original quotes become 8 and 21 |
| Difficult reproduction and minimization | Optional reference covers replay, differential runs, bisection, fuzzing, and incremental reduction | Inspectable technique routes; no claim that every listed tool has been benchmarked |
| Fast runnable loop versus restricted access | Useful evidence can support hypotheses without a local reproduction; retain uncertainty | Restricted trial reasons from two traces without demanding a reproduction or editing code |
| Long or intermittent performance workloads | Compare equivalent workloads and exposure; distinguish location of delay from underlying cause | Restricted trial identifies connection acquisition wait, rejects a confounded release comparison, and proposes a controlled 12-minute run |
| Fix and regression ownership | Compose with the existing TDD skill in the same plugin | Catalog trial records actual RED/GREEN and passes held-out behavior checks |
| Human-assisted Bash collector | Preserve structured observations through the environment's natural channel | No mandatory shared terminal, example localhost app, or editable script remains |

Rejected constraints include a universal seconds-long loop, a required failure
rate, exhaustive minimization, a fixed hypothesis count, and automatic escalation
to an unavailable architecture skill. Missing test coverage warrants examining
the seam and reporting its limits; it does not establish architectural failure.

## Integration

`$ask-matt` routes to `$debug` in `opl`. When that plugin is unavailable, it
continues ordinary diagnosis without claiming skill invocation or requiring an
installation. Both donor manifests, listings, and activation cases reflect the
new ownership. Superpowers Lite retains `$verification-before-completion` and
its existing conflict hook. The historical Sporkflow spec has a migration note.
No duplicate aliases or compatibility entrypoints remain.

The native startup repair also replaces OPL's reference-writing bootstrap with
direct instruction delivery. `codex-agents-context-hook.py` reads the active
installed plugin's `AGENTS.md` through `PLUGIN_ROOT` and returns the full text as
hook `additionalContext`. It runs on startup, resume, clear, compact, and
subagent start, with `additionalContextLimit: 0`. The global `AGENTS.md` remains
user-owned; the hook neither edits it nor relies on `@` path expansion. The old
reference-injection mechanism is removed.

## Validation on 2026-09-09

- `$debug` Codex invocation policy and its references resolve.
- Native contract checks pass for `opl`, `opl-superpowers-lite`,
  `opl-matt-pocock-skills`, and `opl-openspec`.
- Native deterministic checks pass: 14 repository-driver tests, OPL's 68 Node
  and 23 Python tests, 37 OpenSpec tests, and 7 Superpowers Lite tests.
  Matt declares no unit tests. Total: 149 passing tests.
- The direct instruction-context repair passes 12 focused tests after an
  observed regression failure against the old writer. OPL's contract and full
  deterministic suites pass with the replacement. The tests cover complete
  instruction delivery, lifecycle and subagent events, global-file preservation,
  fresh bundled content, and native Windows launch behavior.
- Two independent forward trials pass: a runnable catalog fix and a restricted
  diagnosis-only intermittent/performance investigation. The catalog's three
  final tests and 28 additional held-out checks pass. These finite synthetic
  trials establish specific behavior, not general superiority over the donors.
- `$debug` and `$ask-matt` pass all three activation cases in native Windows.
  The manual-only `$ask-matt` direct case supplies its explicit source path
  because the standalone CLI host does not expose that skill from a bare
  textual invocation. The direct case exercises the unavailable-`opl` route.
  Activation receipts establish selection only; independent forward trials
  above establish the specific debugging behaviors.
- Matt's and Superpowers Lite's native clean installed-copy checkpoints passed
  at the preceding package checkpoint. Lite resumed after interactive trust
  without reinstalling. OPL's refreshed context-hook package matches the source
  inventory and its hooks are discovered; the checkpoint pauses for interactive
  hook trust and requires resuming afterward. OpenSpec's earlier inventory
  matched and its hooks were discovered, but its separate native test home
  still requires hook review.

Retained trial inputs and grading criteria live in
[`tests/evals/fixtures/opl-debug`](../tests/evals/fixtures/opl-debug/README.md).
Trial outputs, source inventory, and local validation receipts live under
`.work/assimilations/debug/`.

The user's runtime correction expanded the implementation to native portability.
The invalid file-URL conversion, interpreter selection, Windows npm launchers,
hook commands, and shell-dependent helper paths are repaired. Native validation
used task-local Node 24.20.0, Python 3.14, and pinned Codex 0.151.0. Earlier Linux
snapshot receipts remain historical; no Windows check starts WSL. The initial
validation left consumer profiles unchanged. See the
[native runtime record](native-plugin-runtime.md) for scope and requirements.

## Recommended improvement to `$assimilate`

Pointing only at `$diagnosing-bugs` would not reliably discover the independent
`$systematic-debugging` owner in another plugin. Borg inventories named donors
and the recipient, then expands for dependencies. An overlapping sibling need
not be a dependency. Once discovered, Borg already has adequate instructions for
resolving conflicting policies, assigning native ownership, migrating callers,
and retiring authorized superseded entrypoints.

Make two narrow changes to that discovery step:

1. Before deep reading, scan available sibling metadata and relevant callers
   for overlapping or complementary capabilities. Bound the scan by the desired
   behavior. Treat discovered neighbors as comparison sources; discovery does
   not authorize modifying or deleting them.
2. Record an explicit retain, replace, or retire disposition for every affected
   entrypoint, including deletion candidates whose removal is not authorized.

Evaluate the change with the exact one-donor request in an isolated fixture
containing the named debugger, an unnamed overlapping debugger, recipient TDD,
a caller, and an unrelated decoy. Observe discovery, conflict resolution, native
ownership, caller migration, and retirement reporting. The current Borg smoke
cases check selection, and its existing assimilation fixture names both donors;
neither establishes unnamed sibling discovery. This report recommends the
improvement without changing Borg's operating instructions.
