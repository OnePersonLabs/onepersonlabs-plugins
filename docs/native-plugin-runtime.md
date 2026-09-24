# Native plugin runtime

The Windows agent operates on `C:\dev\projects\onepersonlabs-plugins` using
native executables and PowerShell. `/mnt/c/...` identifies the same files only
inside WSL; changing the agent runtime does not translate shell syntax.

## Changes

- The repository driver converts file URLs correctly, reuses its Node
  interpreter, selects native Python, resolves Codex npm launchers without
  shell interpolation, and creates Windows junctions for skill evaluation.
- OPL and OpenSpec hook behavior moved from Bash to standard-library Python.
  Manifests select `python` through `commandWindows` and `python3` otherwise,
  with UTF-8 enabled and bytecode writes disabled. Superpowers Lite uses the
  same launch convention.
- Archive parsing understands native PowerShell moves as well as POSIX moves.
  Paths, command wrappers, provider discovery, and child command arguments are
  tested on Windows. Hook outputs preserve their existing JSON protocol.
- Session and research instructions select syntax for the active shell.
  Slop-buster helpers no longer require Bash, GNU find, or Perl. Session audit
  extraction uses the platform temporary directory. Unslop's tmux automation
  remains a POSIX capability, with an explicit native terminal replay route.

Codex substitutes `${PLUGIN_ROOT}` before launching hook commands and supports
the Windows override. Its `Bash` matcher names the shell tool event, including
unified execution on Windows. See the [official hook documentation](https://learn.chatgpt.com/docs/hooks).

## Instruction context

OPL's `codex-agents-context-hook.py` compares the instruction version bundled
with the active plugin against the marker in the effective global instruction
file. It uses `CODEX_HOME` or the default Codex home and honors a nonempty
`AGENTS.override.md` before `AGENTS.md`. The manifest runs the check for
`SessionStart` with `startup|resume|clear|compact`. Matching versions produce no
context; mismatches or missing/invalid metadata produce a short notice naming
$opl:update-instructions. Startup does not retrieve Git history, call a model,
or write instructions. There is no stock instruction injection on subagent start.

The [$opl:update-instructions](../plugins/opl/skills/update-instructions/SKILL.md)
workflow retrieves the historical baseline only when reconciling an update. It
preserves personal modifications and deletions, reviews overlapping changes,
and applies an approved candidate with backup and concurrent-change checks.
Codex's native global instruction loading delivers the reconciled file. Start
a fresh session after applying it; an already-running session retains its
loaded context.

This replaces the earlier full-file injection hook. Existing users explicitly
reconcile their global file through the skill; missing metadata never triggers
an automatic overwrite or fallback injection. The still earlier bootstrap writer
inserted an `@` path that did not load the referenced file. If an installation
retains that reference, inspect the selected home and include its exact removal
in the reviewed reconciliation; cleanup is not a recurring hook.

## Requirements and verification

The phase-zero update passed OPL contracts, deterministic unit checks, and the
isolated installed-copy checkpoint with 22 hooks trusted. Its scoped skill
smoke evaluation could not execute because the configured `gpt-6-sol` model
was rejected by the CLI's ChatGPT account. Independent scenario review covered
initial adoption and preservation of modified/deleted routing. Native root and
subagent instruction delivery still needs an end-to-end model-backed check;
the installed-copy checkpoint does not establish that behavior.

Repository checks require Node.js 24 or newer. OPL and Superpowers Lite hooks
require Python 3.11 or newer; the curated research engine requires 3.12. OpenSpec
archive checks also require Node and the workspace's `pnpm run validate`.
GitHub issue verification requires the native `gh` CLI and its authentication.

The initial native validation used task-local Node 24.20.0, Python 3.14, and
pinned Codex 0.151.0, with consumer Codex configuration and installed plugins
unchanged. Black-box installations are isolated by plugin under `C:\dev\.opl-test`.
Short state paths avoid long filenames when Codex clones bundled marketplaces
on Windows.

Focused tests exercise real Windows manifest commands with spaced paths,
UTF-8 stdin/output, native command wrappers, provider subprocesses, and skill
helpers. Deterministic suites and activation evaluations run only for affected
plugins and skills. The installed checkpoint compares file digests, discovers
hooks, approves only the selected plugin's current hook hashes through Codex's
app-server API, and verifies trusted status. It runs without a terminal,
sign-in, sandbox onboarding, or a manual `/hooks` step.

The historical native deterministic checkpoint passed 149 tests: 14 driver tests,
68 OPL Node tests, 23 OPL Python tests, 37 OpenSpec tests, and 7 Superpowers Lite
tests. Contracts passed for all four affected plugins. The then-current full-file context hook's
12 focused tests passed after a regression failed against the old writer;
OPL's contract and full deterministic suites then passed. That historical coverage included
full instruction text, session and subagent events, unchanged global files,
updated bundled instructions, and the Windows manifest command with a spaced
installed path.

Matt's installed check passed at the preceding package checkpoint. Superpowers
Lite also passed after interactive trust, without reinstalling. OPL's refreshed
context-hook package matches the source inventory and its hooks are discovered;
that earlier checkpoint paused at the former interactive trust gate.
OpenSpec's earlier inventory also matched and hooks were discovered. Current
checkpoints use automatic trust verification in persistent per-plugin homes;
neither requires that earlier manual continuation.

Thirty scoped activation-case receipts were recorded. Eighteen retained model
responses also pass rescoring with the corrected immediate-target detector;
the twelve earlier receipts predate response retention. Manual-only direct
cases supply the exact skill path. These checks establish selection only.

The isolated model-evaluation profile ignores user configuration. On Windows,
the driver must therefore explicitly select the native sandbox backend while
retaining read-only permissions. A regular-file probe with that backend enabled
reached command execution, but Windows denied access to the required RTK
executable in the user's Cargo directory. No ACLs or sandbox permissions were
relaxed. Activation-only receipts therefore do not establish workflow execution;
the native hooks and helpers are covered separately by deterministic tests.
See [Codex's Windows sandbox configuration](https://learn.chatgpt.com/docs/config-file/config-basic#windows-sandbox-mode).

Windows verification does not establish a fresh Linux or macOS execution
result. POSIX launchers and behavior remain supported in source; no WSL
fallback is used by these Windows checks.
