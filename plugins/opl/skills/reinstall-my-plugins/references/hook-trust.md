# Hook trust workflow

Use this workflow only after `plugins/opl/scripts/reinstall-my-plugins.py`
succeeded but did not confirm that all installed marketplace hooks are trusted,
or when resuming after its manual trust pause.

## Automatic TUI attempt

Attempt this branch before asking the user to intervene.

1. Start a second interactive Codex process in a PTY with the same executable
   used by the installer:

   ```bash
   "$codex_bin" --no-alt-screen -C "$repo_root"
   ```

   `-C` receives the resolved local repository directory. Do not pass a
   repository URL or an initial model prompt.
2. Wait for the normal composer to become usable, then enter `/hooks`. Codex
   startup can delay submission; if `/hooks` remains in the composer after
   startup finishes, submit it again rather than assuming the screen opened.
3. Use the event overview, arrow keys, Enter, and Escape to inspect pending hook
   entries. Trust only entries whose `Source` exactly matches a
   `<plugin-name>@<marketplace-name>` ID in the allowlist formed from the current
   manifest and whose `Trust` says that review is required. Match the event and
   plugin ID against the installer's untrusted-hook output when that output is
   available.
4. With an eligible pending hook selected, press `t` to trust it. Do not press
   Space or Enter on the hook detail as a substitute: those keys toggle enabled
   state and can change an intentionally disabled hook.
5. Repeat until no current-marketplace hook needs review. Treat the automatic
   attempt as successful only when the TUI shows the selected hooks as trusted,
   no current-marketplace review warning remains, and no `Failed to trust hook`
   or configuration-write error appeared.
6. Exit the second Codex process cleanly with Escape back to the composer and
   Ctrl-C. Continue the original task without calling the hook-trust checker
   again. The TUI's successful persisted-trust state is the automatic branch's
   completion evidence.

Do not use `--dangerously-bypass-hook-trust`, edit trust hashes in
`config.toml`, or press a global "trust all" action unless every pending hook
has been individually shown to belong to this marketplace. Unfamiliar sources,
commands, or trust prompts require the manual path.

Automatic completion criterion: every pending hook from this marketplace was
trusted through `/hooks`, no TUI write failed, and the second process exited.

## Manual trust pause

The automatic attempt is blocked if a PTY or interactive input is unavailable,
the second CLI cannot reach `/hooks`, the relevant source cannot be identified
with confidence, authentication or directory trust needs human judgment, a TUI
write fails, or the UI differs enough that safe navigation is uncertain.

Terminate the second process if it is still running, then send this request with
the actual executable, marketplace name, and repository path substituted:

> The plugins are reinstalled, but I couldn't complete Codex's hook-trust screen
> automatically. Please run `<codex-bin> --no-alt-screen -C '<repo-root>'`, enter
> `/hooks`, review and trust the pending hooks from `<marketplace-name>`, then
> reply `done`. I'll verify the trusted-hook count and continue.

Pause. Do not test or invoke the changed hooks, rerun the installer, or claim
completion before the user replies affirmatively.

Manual-pause completion criterion: the user has a precise command, source name,
and one-word confirmation that resumes the workflow.

## Check after manual confirmation

Only after the manual pause and an affirmative user reply, run this checker once:

```bash
python3 "$repo_root/plugins/opl/scripts/check-plugin-hook-trust.py" \
  --codex "$codex_bin" \
  --manifest "$repo_root/.agents/plugins/marketplace.json"
```

Interpret its JSON and exit status:

- `{"status":"trusted","hookCount":N}`: report `N`, then resume any deferred
  tests or task work.
- `{"status":"review_required",...}`: list the remaining current-marketplace
  hooks and repeat the manual pause. Do not reinstall.
- `{"status":"unavailable","reason":...}` or unusable output: report the
  reason and remain paused because trust still cannot be verified.

Do not run this checker after a successful automatic TUI flow. Its repeat use is
reserved for verification after a human trust pause.

Post-manual completion criterion: the checker itself reports `trusted` and an
integer `hookCount`.
