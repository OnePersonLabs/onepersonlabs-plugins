---
name: reinstall-my-plugins
description: Reinstall every plugin from the current local marketplace checkout and resolve Codex hook trust to update the codex plugin cache with the latest version. Use when `.agents/plugins/marketplace.json` exists and instructed to do something like `update cache`, `update plugins`, `reinstall plugins`; do not use for remote marketplace URLs or unrelated plugin installs.
disable-model-invocation: false
---

# Reinstall My Plugins

Reinstall the plugins only when the user explicitly authorized a reinstall. A
request to edit, inspect, or test a plugin does not authorize uninstalling it.

## Resolve the local marketplace

1. Resolve `repo_root` with `git rev-parse --show-toplevel` from the current
   working directory.
2. Require both `$repo_root/plugins/opl/scripts/reinstall-my-plugins.py` and
   `$repo_root/.agents/plugins/marketplace.json`. Stop with a concrete error if
   either is absent.
3. Resolve `codex_bin` from `CODEX_BIN` when set, otherwise `codex`, and verify
   that it is executable.
4. Read the marketplace `name` and every `.plugins[].name` from the manifest.
   Form the exact hook-source allowlist as
   `<plugin-name>@<marketplace-name>` for the TUI trust branch.

The resolved `repo_root` directory is the marketplace source. Do not substitute
a GitHub shorthand, Git URL, remote marketplace, or another checkout.

Completion criterion: the exact local marketplace root, installer, manifest,
marketplace/plugin allowlist, and Codex executable are known before any
installed state changes.

## Reinstall once

Run `CODEX_BIN="$codex_bin" ./plugins/opl/scripts/reinstall-my-plugins.py` from
`repo_root` and retain its complete output and exit status. The repository
installer owns marketplace removal, plugin uninstall, local-directory
marketplace registration, reinstall, and the initial hook-trust inspection; do
not reproduce those operations separately.

- On a nonzero exit, report the failing installer output and stop.
- On `Hook trust check: all N installed marketplace hooks are trusted.`, record
  `N` and continue the user's task.
- On `Hook trust review required.`, `Hook trust check unavailable:`, or a
  successful install without an unambiguous final trust result, read
  [references/hook-trust.md](references/hook-trust.md) and follow it.

Do not test or invoke changed plugin hooks while trust is unresolved.

Completion criterion: installation succeeded and either the installer confirmed
all hooks trusted or the hook-trust workflow reached one of its explicit pause
or success states.

## Resume after a manual pause

When the user affirmatively confirms that manual trust is complete, do not run
the installer again. Read [references/hook-trust.md](references/hook-trust.md)
and perform only its post-manual trust check before resuming deferred work.

Completion criterion: the post-manual checker reports `trusted` and its
`hookCount`; otherwise remain paused with the checker evidence.
