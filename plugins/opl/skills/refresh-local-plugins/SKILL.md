---
name: refresh-local-plugins
description: Install or refresh selected Codex plugins from a local marketplace checkout into an authorized Codex home. Use after local plugin edits, for stale installed copies, or to preview a local refresh; not for publishing or general plugin questions.
disable-model-invocation: false
---

# Refresh Local Plugins

Refresh selected plugins from their source checkout through Codex's native
installer. The bundled helper works across local marketplace repositories;
the target repository needs no OPL scripts, package matrix, or npm setup.

## Resolve the request

Infer the source checkout and selected plugins from the user's request and
existing session context. Inspect the marketplace when names or layout are
unclear. Select every plugin only when the user explicitly requests all.

Use the Codex home authorized by the user or established session context,
resolved to an absolute path. An environment variable or a default `~/.codex`
location alone does not authorize changing that home. Clarify only material
missing scope or destination information; existing refresh authorization
does not require another confirmation.

Keep discovery or preview requests read-only. Inspect available sources and,
when the inputs are known, use `--dry-run`; do not turn a preview into an install.

## Run the bundled helper

Resolve `scripts/install-local.mjs` relative to this **loaded skill's actual
directory**, including when this skill is installed in Codex's plugin cache.
Do not look for the helper in the target repository. Use Node.js 22 or newer
and the installed Codex CLI; `CODEX_BIN` can select a native executable or a
JavaScript entrypoint.

```text
node <loaded-skill-directory>/scripts/install-local.mjs --repo <source-checkout> --plugin <name> --target-home <absolute-codex-home>
```

Repeat `--plugin <name>` for multiple selections. Use `--plugin all` by itself
only for an explicit whole-marketplace request. `--repo` defaults to the current
directory; pass it explicitly when the source checkout is elsewhere. Add
`--dry-run` for read-only preflight or use `--help` for the full CLI contract.
Dry-run checks local inputs; the registration check runs when installing.

Use a source checkout outside the installed plugin cache. The helper validates
the selected local sources and existing marketplace root before installation;
a same-name marketplace pointing elsewhere is an error, not permission to
rebind it. Resolve that conflict with the user instead of removing its entry.

The helper calls native `codex plugin add` to atomically refresh and enable
each selected plugin, including unchanged versions. An authorized refresh also
authorizes trusting that local plugin's current installed hooks. The helper
uses Codex's app-server API to save only those hook hashes and verify their
trusted status. It preserves unrelated hooks and sandbox settings. Do not open
a new terminal or ask for sign-in, sandbox setup, or manual `/hooks` approval.

It can refresh OPL itself: its modules are loaded before installation and Codex
runs from the checkout.
Do not add uninstall steps, version cachebusters, or verification commands.
Run tests separately only when requested or required by the development task.

## Report the result

Report the refreshed plugin IDs and installed paths, or the preflight result.
Surface failures with the affected plugin and completed progress. After an
install, report verified hook trust and tell the user to start a fresh Codex
session to load updated components. Installation and trust verification do not
prove the plugin's tests pass or that its hooks execute correctly.
