# OPL ADHD

> Reduce the executive burden of complex project work without reducing the quality of the outcome.

## What it does today

`$adhd` provides ADHD-aware assistance for project work. It helps Codex maintain one active path, preserve relevant task state, make completion observable, recover cheaply after interruption, protect scope, and break repeated failed attempts with discriminating evidence.

It can activate when the conversation involves task overload, trouble starting, interruption recovery, too many choices, scope creep, perfectionistic overrun, repeated unproductive iteration, or explicit capacity strain. Invoke it directly with `$adhd`, or use lightweight controls such as `one thing`, `resume`, `park that`, and `normal mode` while it is active.

The current implementation is one instruction-only skill. It has no hooks, scripts, MCP server, persistent state, configuration system, or dependency on Projector. It is task-execution and response-design assistance, not diagnosis, treatment, or general life management.

## Provenance

The work began with the [`adhd-guardrails` skill from borg-collective](https://github.com/noah-goodrich/borg-collective/blob/main/skills/adhd-guardrails/SKILL.md). Its causal value was investigated alongside the [`i-have-adhd`](https://github.com/ayghri/i-have-adhd) and [`adhd-and-47-tabs`](https://github.com/zgbrenner/adhd-and-47-tabs) agent skills, the donor's [linked ADHD research](https://github.com/noah-goodrich/borg-collective/blob/main/docs/research.md), and the W3C's [cognitive accessibility guidance](https://www.w3.org/TR/coga-usable/). The resulting skill was independently authored for this repository; no source skill text, code, runtime, or support infrastructure is bundled here.

The retained value is external executive function for project work: make task state visible, reduce competing paths, protect a concrete finish, preserve continuity across interruptions, and recover from unproductive loops using evidence.

### Deliberately not assimilated

The current skill does not infer diagnosis or energy from writing style, prescribe fixed breaks without reliable evidence, require `PROJECT_PLAN.md`, impose arbitrary list limits, invent time estimates, force a next action after completed work, or import infrastructure from the donor repository. Those mechanisms either exceeded the available evidence or created new work for the person the skill is meant to support.

## Later direction -- not implemented

The longer-term direction is an opt-in, ADHD-specific coordination layer between a person and coding agents: a technological cognitive exoskeleton that helps the agent understand, preserve, and re-enter sprawling mental work without making the person translate that work into a rigid productivity system.

The intended future shape is globally available across projects and sessions but dormant until explicitly enabled. A naked `$adhd` invocation would open an interactive, globally situated control surface; focused invocations such as `$adhd enable` would perform a specific operation, and an `adhd-config` story would make its behavior inspectable and controllable from any project.

A durable temporal work-thread ledger would model branches of work and their relationships across time, including the project and session where each branch arose and whether it was interrupted, parked, resumed, blocked, superseded, or completed. This is specifically not another general agent-memory system: the ledger would store structured work state, evidence, transitions, and relationships needed for coordination rather than indiscriminately retaining conversations or personal information.

Assistance would evolve through focused scenarios, using the ledger and current context to choose useful interventions without becoming a monolithic task manager. A later integration with scope-aware, progressively disclosed specification graphs, potentially through Projector, could let the system follow relevant specification dependencies and surface downstream breakage without loading unrelated project context.

These are design goals, not promises or current capabilities. This release does not implement global enablement, configuration, persistence, a temporal ledger, autonomous background behavior, specification analysis, or Projector integration.
