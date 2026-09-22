# OpenSpec

OpenSpec workflow skills for Codex.

Aligned with [OpenSpec 1.13.1](https://github.com/Fission-AI/OpenSpec/releases/tag/v1.13.1)
(upstream commit `634c557bd0470eec37861b46172c3f503d283c1b`). Use that CLI version
or newer for the documented commands. This plugin does not bundle or upgrade the CLI.
`$openspec-update-change` revises existing planning artifacts; `openspec update`
is the separate CLI command for refreshing generated tooling.

Nested capability ids retain their full relative paths, such as
`identity/user-auth`, across planning, audit, review, sync, and archive. Changes
themselves remain direct children of `openspec/changes/`; nested spec support
does not introduce namespaced change directories.

The audit's small `spec_inventory.mjs` helper recursively inventories main specs,
requirements, scenarios, and source lines. It supports exact capability filtering
and JSON or Markdown output, ignores hidden directories and fenced examples, and
does not traverse directory symlinks or junctions. It is an audit index, not a
replacement validator or a proof that implementation satisfies a requirement.
OpenSpec owns structural validation; the audit skill owns semantic comparison.

Upstream workflow changes are merged selectively. Local additions retained here
include native PowerShell archive commands and path containment checks, the
finish pipeline's new/existing-change distinction, reconciliation evidence rules,
the generic-finish E2E boundary, and existing skill activation policies. The
archive quality and discipline hooks remain mandatory for recognized archive
moves, including date-prefixed change names. Workflow entry also covers metadata
edits such as `skip_specs`; stock-skill protection allows local `openspec-x-*`
extensions and plugin source development.

Hooks run with Python 3 using the standard library on Windows, macOS, and Linux.
Windows hook commands select `python`; other platforms select `python3`. Archive
command parsing also requires Node.js, and archive quality checks require the
workspace's `pnpm run validate` command. Node.js and these tools must be on PATH;
hooks do not start WSL or change the user's toolchain.

This plugin bundles the `openspec-*` workflow skills, focused semantic audit and reconciliation extensions, their supporting scripts, and structural hooks that keep selected OpenSpec changes coherent. Install it from the One-Person Labs plugin marketplace, then invoke skills with names such as `$openspec-propose`, `$openspec-apply-change`, or `$openspec-x-finish`.

Install `opl` alongside this plugin for universal response and artifact discipline enforcement. `opl-openspec` handles deferrals backed by existing active or archived OpenSpec changes before `opl` applies its unhandled-deferral catch-all. It also requires active artifacts to be edited inside an OpenSpec skill workflow, and owns archive-time discipline and quality plus stock-artifact protection. Work queues, priority, blocking relationships, and multi-change scheduling belong to an external work tracker rather than this plugin.
