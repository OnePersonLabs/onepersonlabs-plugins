# One-Person Labs

Shared skills, agents, integrations, and universal Codex guard hooks created or adapted by One-Person Labs.

Hooks run with Python 3.11 or newer: `python` on native Windows and `python3`
on POSIX. They use the standard library and explicit UTF-8 mode. Node.js is
also needed when an installed Codex npm launcher is used for provider discovery;
GitHub issue verification requires `gh`. Shell commands and paths in the
session tools follow the active runtime. The curated research engine requires
Python 3.12 or newer.

This plugin owns the repository-independent, last-resort rejection of unhandled ephemeral deferrals and TODO-shaped placeholders. Before rejecting a line, it asks enabled providers whether one recognizes and verifies the line through a durable work-item sink. OPL includes a generic GitHub Issues provider: a deferral that names one or more issues is accepted only when every referenced issue exists and remains open.

Other workflow-specific handlers and lifecycle rules remain in their workflow plugins. In particular, `opl-openspec` owns OpenSpec deferral resolution, active-artifact workflow entry, archive-time discipline and quality, and stock-artifact protection. Work queues, priority, blocking relationships, and multi-change scheduling remain outside the OpenSpec plugin.

## Instruction Context

The context hook loads this plugin's installed `AGENTS.md` directly into Codex
on session startup, resume, clear, compact, and subagent start. It reads the
active plugin through `PLUGIN_ROOT` and returns the complete file as hook
`additionalContext`, with `additionalContextLimit: 0`.

The hook preserves the user's global `AGENTS.md`. The old bootstrap mechanism
that inserted an `@` reference into that file has been removed; instruction
loading no longer depends on path text being expanded as an include.

Twelve native tests cover complete instruction delivery, lifecycle events,
global-file preservation, refreshed bundled content, and Windows launch paths.
The [native runtime record](../../docs/native-plugin-runtime.md) distinguishes
this deterministic coverage from the installed-copy checkpoint.

## User-Invoked Workflow

[`handoff`](skills/handoff/SKILL.md) compacts the current conversation into a temporary handoff document so the user can manually continue the work in a new session.

## Debugging

[`$debug`](skills/debug/SKILL.md) is the canonical debugging workflow. It combines
causal investigation, symptom-specific reproduction, and realistic regression
coverage, with optional techniques for intermittent and performance failures.
Diagnosis-only requests remain diagnosis-only; implementation composes with
`$test-driven-development` in this plugin.

It replaces `$diagnosing-bugs` from OPL Matt Pocock Skills and
`$systematic-debugging` from OPL Superpowers Lite. Install `opl` to use `$debug`.
The repository's [assimilation record](../../docs/debug-skill-assimilation.md)
records provenance, design choices, and validation.

## Why OPL TDD Exists

OPL introduced [`test-driven-development`](skills/test-driven-development/SKILL.md) after finding high-risk guidance in two alternatives:

- Agent Skills 0.6.7 hard-codes test-layer ratios and expands ordinary TDD into browser-tool and subagent workflows that may be unavailable or disproportionate.
- Superpowers 6.3.0 directs agents to delete implementation written before tests, contains a broken sync/async TypeScript example, and contradicts behavior-level testing with a per-function test mandate.

The skill keeps stack discovery, meaningful RED evidence, realistic boundaries, and safe brownfield handling without those failure modes.
