# One-Person Labs

Shared skills, agents, integrations, and universal Codex guard hooks created or adapted by One-Person Labs.

This plugin owns the repository-independent, last-resort rejection of unhandled ephemeral deferrals and TODO-shaped placeholders. Before rejecting a line, it asks enabled providers whether one recognizes and verifies the line through a durable work-item sink. OPL includes a generic GitHub Issues provider: a deferral that names one or more issues is accepted only when every referenced issue exists and remains open.

Other workflow-specific handlers and lifecycle rules remain in their workflow plugins. In particular, `opl-openspec` owns OpenSpec deferral resolution, active-artifact workflow entry, and archive-time discipline, ordering, quality, stock-artifact, and dependency validation.
