# Plugin Marketplace Normalization Design

## Objective

Make each immediate directory under `plugins/` a valid Codex plugin. Register
the complete plugin set in the repository marketplace. Use consistent OPL
names in manifests and user-facing labels.

## Plugin Identity

Each immediate plugin directory is one marketplace plugin. Its manifest name
and marketplace name must equal the directory name. Each name must start with
`opl-`. Each `interface.displayName` value must start with `OPL `.

Keep existing manifest metadata when it follows these rules. Change only the
name or display name when required. Add a `.codex-plugin/plugin.json` manifest
to each directory that does not have one.

## Marketplace

Rebuild `.agents/plugins/marketplace.json` from the current immediate plugin
directories. Remove all entries for deleted or renamed directories.

Each entry uses a local source path in this form:

```text
./plugins/<plugin-name>
```

Keep the existing `AVAILABLE` installation policy and `ON_INSTALL`
authentication policy. Use `Developer Tools` for development workflow plugins.
Use `Productivity` for writing, research, and general task plugins.

## Installed Plugin Cleanup

Inspect `~/.codex/plugins/` before deletion. Remove only installed plugin
directories that clearly match a current or stale plugin from this repository.
Use directory names, manifest names, marketplace names, and source metadata as
evidence. Do not remove an ambiguous installed plugin.

After cleanup, run the repository install script. The script registers the
local marketplace and installs every marketplace entry.

## Verification

The verification must confirm these conditions:

- each immediate plugin directory contains valid `.codex-plugin/plugin.json`;
- each manifest and marketplace name starts with `opl-`;
- each display name starts with `OPL `;
- marketplace names are unique;
- marketplace entries exactly match the immediate plugin directories;
- each marketplace source path exists;
- the repository install script completes successfully;
- the Codex plugin list contains all marketplace plugins after installation;
- `git diff --check` reports no whitespace errors.

## Delivery

Commit all current worktree changes after verification. Push the current
`main` branch to its configured upstream remote. If installation, commit, or
push fails, keep the verified repository edits and report the exact failure.
