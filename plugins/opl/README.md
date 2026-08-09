# One-Person Labs

Shared skills, agents, integrations, and universal Codex guard hooks created or adapted by One-Person Labs.

This plugin owns the repository-independent, last-resort rejection of unhandled ephemeral deferrals and TODO-shaped placeholders. Before rejecting a line, it asks enabled domain plugins whether one of them recognizes and verifies the line through a durable work-item sink. The core policy contains no OpenSpec, Linear, or other workflow-specific resolution logic.

Workflow-specific handlers and lifecycle rules remain in their workflow plugins. In particular, `opl-openspec` owns OpenSpec deferral resolution and archive-time discipline, ordering, quality, stock-artifact, and dependency validation.
