# Repository Instructions

## Installed plugin cache and hook trust

This repository is the source for a local Codex plugin marketplace. When a
change touches a plugin hook, `hooks.json`, or a hook-owned script, run
`./plugins/opl/scripts/reinstall-my-plugins.py` before any test that can invoke
or exercise that hook.
Run it again after every later hook edit. The installed cached plugin copy, not
the repository file, is the hook implementation Codex tests.

When the user asks to reinstall plugins from this repository, invoke
`$reinstall-my-plugins` when available. It runs
`./plugins/opl/scripts/reinstall-my-plugins.py` from the repository root; the
installer reads `.agents/plugins/marketplace.json` and reinstalls every listed
plugin through the Codex CLI from this local checkout. If the skill is
unavailable, run `./plugins/opl/scripts/reinstall-my-plugins.py` directly and
use the manual trust pause below.

Treat the final `./plugins/opl/scripts/reinstall-my-plugins.py` output as agent
instructions. Under `$reinstall-my-plugins`, follow its bounded second-CLI
`/hooks` attempt and manual fallback. Outside that skill, if the installer
reports that hook trust review is required or could not be verified, ask the
user to review and trust the changed hooks in Codex, then pause until the user
explicitly confirms trust. Do not test, invoke, or continue work involving
unresolved hooks. Proceed without a trust pause only when the installer
explicitly reports that all installed marketplace hooks are trusted or the
skill's automatic TUI flow completes successfully.
