---
name: verification-before-completion
description: Use before claiming work is complete, fixed, correct, passing, ready to commit, or ready to ship.
disable-model-invocation: false
---

# Verification Before Completion

Completion claims require fresh evidence from the current work state. Confidence,
inspection, an earlier run, or another agent's report is not verification.

## The Gate

Before making a positive status claim:

1. **Name the claim** -- Be precise about what is supposedly complete or correct.
2. **Choose proof** -- Identify the command or direct observation that exercises
   the relevant behavior and scope.
3. **Run it fresh** -- Execute after the last change that can affect the result.
4. **Read the result** -- Check exit status, failure count, skipped checks, and
   whether the command actually covered the claim.
5. **Report the evidence** -- State what passed, failed, or could not be run. Make
   no broader claim than the evidence supports.

Do not repeat an unchanged command merely for reassurance. Run it again when
code, tests, configuration, dependencies, environment, or another relevant
input changed, or when nondeterminism is under investigation.

## Match Evidence to the Claim

| Claim | Suitable evidence | Insufficient substitute |
| --- | --- | --- |
| Tests pass | The affected test command reports zero failures | A previous run or a subset with unexplained exclusions |
| Build succeeds | The project build exits successfully | Lint or tests alone |
| Bug is fixed | The original reproduction and regression test pass | Reading the patch |
| Requirements are met | Each requirement is checked against output and behavior | Tests without requirement coverage |
| Delegated work is complete | Inspect the resulting diff and run relevant checks | The delegate's success message |
| Ready to commit or ship | Repository-required gates pass on the final state | “Looks good” or expected CI behavior |

Use the repository's own scripts, wrappers, and CI-equivalent commands. Choose
verification proportional to the affected surface: a focused check proves a
narrow behavior; broader claims require broader checks.

## Unavailable or Failing Evidence

When a required check cannot run, report:

- the exact command or observation attempted;
- the failure, missing dependency, or environmental constraint;
- what narrower evidence, if any, succeeded; and
- the residual uncertainty.

Do not hide skipped, disabled, flaky, or timed-out checks. A pre-existing failure
still limits the claim unless evidence cleanly establishes that it is unrelated.

## Communication Rule

Lead with the actual state supported by evidence. Distinguish:

- **verified** -- directly established after the last relevant change;
- **partially verified** -- some affected surfaces remain unchecked; and
- **unverified** -- no adequate proof was obtained.

Only the first state supports an unqualified completion claim.
