# Local plugin development

This repository implements a layered, two-loop workflow. Source checks provide
fast feedback while a separate black-box Codex home proves the copied plugin
bundle at deliberate checkpoints. A plugin update does not reinstall or test
the entire marketplace.

## Repository boundaries

- `plugins/<name>/` is canonical shipping source only.
- `packages/` contains product source that is not part of a plugin bundle.
- `tests/unit/<name>/` contains deterministic tests outside shipping roots.
- `tests/evals/cases/<name>.jsonl` contains retained behavioral cases.
- `tools/plugin-dev.mjs` is the finite command façade.
- `.work/` contains disposable authoring hosts and eval receipts.
- `OPL_PLUGIN_DEV_STATE` selects persistent Codex authoring and black-box state;
  it defaults outside the checkout under the user's local state directory.

## Native runtimes

Run the same commands from native PowerShell on Windows or a POSIX shell on
Linux and macOS. Use Node.js 24 or newer; child Node tests reuse the interpreter
that launched the driver. Python tests use `python` on Windows and `python3`
elsewhere. Set `PYTHON_BIN` to an interpreter path when a project needs a
specific Python environment.

`CODEX_BIN` can select a native Codex executable or its `.js`/`.mjs` entrypoint.
On Windows, the driver resolves standard npm Codex shims to the adjacent
`@openai/codex/bin/codex.js` and launches it with Node, passing arguments directly.
Skill evaluation hosts use directory junctions on Windows and directory
symlinks elsewhere. Printed hook-trust commands use the host shell's quoting
and environment-assignment syntax.

Windows skill evaluations explicitly select `windows.sandbox="elevated"`
while retaining `--sandbox read-only`: `--ignore-user-config` would otherwise
omit the native sandbox backend. Complete the documented
[Windows sandbox setup](https://learn.chatgpt.com/docs/config-file/config-basic#windows-sandbox-mode)
for the isolated authoring home under `OPL_PLUGIN_DEV_STATE` before evaluating.
If sandbox setup or executable access prevents a command from running, retain
the error as an execution limitation. Inspect the saved response and
`.events.json` receipt: a skill announcement demonstrates selection, while
successful command events establish execution of the requested workflow.

Plugin hooks use Codex's `commandWindows` override to select `python` on
Windows, while the default command selects `python3`. Both run with
`-B -X utf8`. Codex resolves `${PLUGIN_ROOT}` before launching the hook; the
`Bash` event matcher also covers unified `exec_command` calls on Windows.
See [Codex hooks](https://learn.chatgpt.com/docs/hooks) and the
[native portability record](native-plugin-runtime.md).

## Inner loop

Choose the smallest observable behavior, run its focused test, make it pass,
and then run only the affected plugin's deterministic checks:

```bash
npm run test:focus -- --file tests/unit/opl/example.test.mjs
npm run test:contract -- --plugin opl
npm run test:unit -- --plugin opl
```

Capability checks remain scoped:

```bash
npm run test:mcp -- --plugin opl
npm run test:ui -- --plugin opl
npm run eval:smoke -- --plugin opl --skill session-reader
```

`eval:smoke --skill` selects only cases belonging to that skill. It does not
evaluate sibling skills or other plugins.

## Installed checkpoint

Run this only when a coherent change affects files that will be packaged:

```bash
npm run test:installed -- --plugin opl
```

The driver validates and deterministically tests that plugin, removes any prior
One-Person Labs plugin from the isolated black-box home, installs the selected
candidate, compares every installed file digest to source, and confirms hook
discovery when hooks are declared.

Hook trust is deliberately interactive. Exit status 78 means the copied hook
definitions were discovered but need review. Run the printed Codex command,
open `/hooks`, trust the selected plugin, and reply `done`. Then continue with:

```bash
npm run test:installed -- --plugin opl --resume-after-trust
```

The continuation reads the saved install receipt. It verifies the same
installed path and does not reinstall.

## Installation is not verification

Updating a consumer profile is an explicit, installation-only operation:

```bash
npm run install:local -- --plugin opl --target-home /absolute/codex/home
```

It removes and adds only the selected plugin. It does not invoke any contract,
unit, installed, MCP, UI, or model-evaluation command. Use `--plugin all` only
when intentionally installing the complete marketplace. Start a new Codex
session after installation and review selected hooks through `/hooks`.

## Repository and release gates

```bash
npm run verify
npm run release:verify
```

`verify` is the deterministic gate: root driver tests, all plugin contracts,
all deterministic unit/native tests, pinned MCP launcher contracts, and UI
checks where applicable. It performs no model evaluation.

`release:verify` is intentionally expensive. It adds clean installed-copy
checks for every plugin and the complete retained behavioral evaluation corpus.
It is the only standard command that evaluates every shipped skill.

CI runs `npm ci`, `npm run verify`, and package/discovery-only clean installs.
Model evaluations and interactive hook trust stay in the explicit release
workflow.
