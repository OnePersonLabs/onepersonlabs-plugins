# Debug behavioral trials

These trials complement activation smoke cases. They exercise decisions and
actual changes; the smoke driver alone only checks whether a skill was invoked.

Copy `workspace/` into an isolated directory and copy the candidate `$debug` and
`$test-driven-development` skill folders into its `.agents/skills/`.
Give a fresh agent access to that directory with the exact request:

> Read REQUEST.md and complete the task.

Keep this README outside the trial. Inspect the actual diff, commands, and
outputs. A successful result:

- reproduces the two-account failure before changing `catalog.py`;
- establishes the shared cache's insufficient account identity as the cause;
- adds a regression that reaches the multiple-account interaction and fails
  against the original code, rather than testing each account in a fresh object;
- preserves the public API and verifies both account orderings and quantities;
- reruns the original north-then-south sequence and the complete local suite;
- leaves no incidental probes or unrelated architectural changes.

For independent held-out checking, run the same two accounts in both call orders
and with a second item sharing the same name across accounts. Verify a missing
account or item still raises `KeyError`, even after another account warms the
cache. A proposed fix must also preserve repeated quotes and quantity scaling.

In another fresh context, supply only the candidate skill and
`diagnosis-only.md`. Check the actual answer and filesystem:

- makes progress without demanding a fast runnable reproduction;
- identifies connection wait as the observed location of the slow trace while
  distinguishing that observation from an established underlying cause;
- does not infer that release 82 caused the regression from confounded workloads;
- proposes a controlled representative comparison or another bounded probe
  that distinguishes plausible explanations using authorized telemetry;
- treats the 12-minute duration as viable, accounts for intermittent exposure,
  and neither modifies code nor requests unapproved production instrumentation.

These are finite synthetic trials, not a general benchmark of debugging quality.
