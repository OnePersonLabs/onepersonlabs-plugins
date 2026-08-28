# One-Person Labs

Shared skills, agents, integrations, and universal Codex guard hooks created or adapted by One-Person Labs.

This plugin owns the repository-independent, last-resort rejection of unhandled ephemeral deferrals and TODO-shaped placeholders. Before rejecting a line, it asks enabled providers whether one recognizes and verifies the line through a durable work-item sink. OPL includes a generic GitHub Issues provider: a deferral that names one or more issues is accepted only when every referenced issue exists and remains open.

Other workflow-specific handlers and lifecycle rules remain in their workflow plugins. In particular, `opl-openspec` owns OpenSpec deferral resolution, active-artifact workflow entry, archive-time discipline and quality, and stock-artifact protection. Work queues, priority, blocking relationships, and multi-change scheduling remain outside the OpenSpec plugin.

## User-Invoked Workflow

[`handoff`](skills/handoff/SKILL.md) compacts the current conversation into a temporary handoff document so the user can manually continue the work in a new session.

## Why OPL Curated TDD Exists

OPL introduced [`test-driven-development-curated`](skills/test-driven-development-curated/SKILL.md) after finding high-risk guidance in two alternatives:

- Agent Skills 0.6.7 hard-codes test-layer ratios and expands ordinary TDD into browser-tool and subagent workflows that may be unavailable or disproportionate.
- Superpowers 6.3.0 directs agents to delete implementation written before tests, contains a broken sync/async TypeScript example, and contradicts behavior-level testing with a per-function test mandate.

The curated skill keeps stack discovery, meaningful RED evidence, realistic boundaries, and safe brownfield handling without those failure modes.
