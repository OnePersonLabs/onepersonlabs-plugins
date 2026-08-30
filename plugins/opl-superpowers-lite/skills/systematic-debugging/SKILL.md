---
name: systematic-debugging
description: Use when a bug, failing test, performance regression, build failure, or unexpected behavior needs diagnosis before a fix.
disable-model-invocation: false
---

# Systematic Debugging

Find the causal mechanism before changing production behavior. A plausible
explanation is a hypothesis; a root cause is a hypothesis supported by evidence
that explains the observed failure.

## Scope

Diagnosis does not imply permission to implement a fix. When the user asks only
for diagnosis, investigate and report the cause without changing production
behavior. Prefer read-only evidence; add temporary instrumentation only when
edits are within scope, and remove it unless it has durable operational value.

## Investigation Loop

1. **Define the failure** -- Record the exact symptom, expected behavior, error
   output, environment, and reproduction steps. Read the complete error and
   stack trace before interpreting it.
2. **Reproduce and bound it** -- Determine whether the failure is deterministic,
   data-dependent, environment-specific, or intermittent. If it cannot be
   reproduced, collect observations rather than guessing.
3. **Trace the causal chain** -- Follow the bad value, state transition, request,
   or side effect backward through callers and component boundaries. Check
   recent diffs and compare with the nearest working example.
4. **State one hypothesis** -- Write: “X causes the failure because Y evidence
   connects it to Z symptom.” Name the observation that would falsify it.
5. **Run the smallest discriminating experiment** -- Change one variable or add
   one observation. Prefer reversible probes. Protect secrets and user data in
   logs and diagnostic output.
6. **Reconcile** -- If the result contradicts the hypothesis, discard it and
   return to the evidence. If it supports the hypothesis, verify that the full
   causal chain explains the original symptom and nearby counterexamples.

In multi-component systems, capture inputs and outputs at each relevant
boundary until the first divergence is located. Do not add instrumentation to
every layer by default; instrument only boundaries that distinguish the active
hypotheses.

## From Cause to Fix

When implementation is requested:

1. Add a regression test that fails because of the confirmed defect. Use
   `$test-driven-development-curated` when available.
2. Make one coherent change at the owning layer. Avoid compensating at a
   downstream symptom unless the boundary itself owns that recovery behavior.
3. Reproduce the original scenario, run the affected tests, and use
   `$verification-before-completion` before reporting success.

If several well-formed hypotheses fail, stop accumulating patches. Recheck the
reproduction, assumptions, observability, and component boundaries. Escalate an
architectural question only when evidence shows the current ownership or
coupling prevents a local fix.

## Evidence Standards

| Claim | Required evidence |
| --- | --- |
| “X is the root cause” | A causal chain plus an experiment that distinguishes X from alternatives |
| “Only environment Y fails” | Controlled comparison with relevant environment differences |
| “The fix works” | Original reproduction passes and affected regression checks are green |
| “The issue is external” | Local causes were bounded and external behavior was directly observed |

## Warning Signs

- proposing changes before reproducing or bounding the symptom;
- making several speculative edits before observing results;
- treating correlation with a recent change as proof;
- continuing to patch downstream symptoms as new failures appear; or
- claiming certainty while material evidence remains unavailable.

When a warning sign appears, return to the smallest unresolved link in the
causal chain and gather evidence there.
