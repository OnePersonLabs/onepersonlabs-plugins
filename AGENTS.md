# Repository Instructions

## Installed plugin cache and hook trust

This repository is the source for a local Codex plugin marketplace. When a
change touches a plugin hook, `hooks.json`, or a hook-owned script, run
`./install.sh` before any test that can invoke or exercise that hook. Run it
again after every later hook edit. The installed cached plugin copy, not the
repository file, is the hook implementation Codex tests.

When the user asks to reinstall a plugin from this repository, run
`./install.sh` from the repository root before testing or reporting completion.
The installer reads `.agents/plugins/marketplace.json` and reinstalls every
listed plugin through the Codex CLI.

Treat the final `./install.sh` output as agent instructions. If it reports that
hook trust review is required or that trust could not be verified, ask the user
to review and trust the changed hooks in Codex. Pause until the user explicitly
confirms trust. Do not test, invoke, or continue work involving those hooks
before that confirmation. Proceed without a trust pause only when the installer
explicitly reports that all installed marketplace hooks are trusted.
