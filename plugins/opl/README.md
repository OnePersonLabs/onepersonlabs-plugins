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

## Codex Compatibility

OPL checks enabled plugins, skills, and MCP servers against shipped conflict
rules and optional repository policy in `.opl/config.json`. It supports
conditional requirements, recommendations, and session acknowledgments. See
the [compatibility guide](compatibility/README.md) for configuration,
cherry-picking skills, and diagnostics.

## User-Invoked Workflow

[`handoff`](skills/handoff/SKILL.md) compacts the current conversation into a temporary handoff document so the user can manually continue the work in a new session.

## Long Command Wakeup

[`$long-command-wakeup`](skills/long-command-wakeup/SKILL.md) runs a known-long,
unattended local command through a detached Python worker and queues one bounded
continuation when the command succeeds, fails, cannot launch, or times out. It
persists stdout, stderr, status, and queue-delivery evidence without copying
tooling into the target repository or repeatedly waking the model to poll.

## Refresh Local Plugins

[$refresh-local-plugins](skills/refresh-local-plugins/SKILL.md) installs or
refreshes selected plugins from any local Codex marketplace checkout into an
authorized Codex home. It is available through normal skill discovery and
explicit invocation. For example: "Use $refresh-local-plugins to refresh
`my-plugin` from `/work/my-marketplace` into `/absolute/codex/home`."

Its bundled Node.js 22+ helper also powers this repository's `install:local`
command. Native `codex plugin add` atomically refreshes and enables selected
plugins without version bumps; `--dry-run` provides a read-only preview. The
helper preflights local sources and the registered marketplace root, trusts
only the selected plugins' installed hooks through Codex's app-server API,
and verifies their trusted status. It performs no tests and supports refreshing
OPL itself from a source checkout. There is no interactive sign-in, sandbox
onboarding, or hook-review step; start a fresh Codex session afterward.

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
