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
- `OPL_PLUGIN_DEV_STATE` selects persistent Codex authoring and per-plugin black-box state;
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
symlinks elsewhere. Installed checks and local refreshes use Codex's app-server
API for hook trust, without opening a Codex terminal.

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
One-Person Labs plugin from its isolated black-box home, installs the selected
candidate, compares every installed file digest to source, and confirms hook
discovery when hooks are declared.

The home is `blackbox/<plugin-name>` under `OPL_PLUGIN_DEV_STATE`. Hook trust is
automatic: the driver discovers the selected plugin's installed hook definitions,
saves their current hashes through `config/batchWrite`, and queries them again
to verify trusted status. It checks that the definitions belong to the installed
bundle and that configuration writes target that isolated home. Unrelated hook
state is preserved.

This checkpoint requires no login, sandbox onboarding, model turn, terminal, or
manual confirmation. It does not bypass hook trust or change sandbox settings.
Discovery and trust failures fail the command. Trust verification establishes
the current approval state; deterministic tests separately cover hook behavior.
`--package-only` skips the deterministic tests, as in CI, but still verifies the
installed copy and selected hook trust.

## Installation is not verification

Updating a consumer profile is an explicit, installation-only operation:

```bash
npm run install:local -- --plugin opl --target-home /absolute/codex/home
```

It calls native `codex plugin add` to atomically refresh and enable only the
selected plugins, including when the version is unchanged. It does not invoke
any contract, unit, installed, MCP, UI, or model-evaluation command. Repeat
`--plugin <name>` for multiple selections, or use `--plugin all` alone when
explicitly installing the complete marketplace. Add `--dry-run` to preview
the local sources, selection, and destination without invoking Codex or changing
files; registration is checked when installing. Authorized local installs also
trust the selected plugins' current hooks through the same app-server API and
verify the result. Start a new Codex session after installation to load updates;
there is no manual hook-review step.

The command shares its installer with OPL's
[$refresh-local-plugins](../plugins/opl/skills/refresh-local-plugins/SKILL.md).
Once OPL is installed, the skill can refresh plugins from another local
marketplace without adding this repository's npm tooling to that checkout:

```text
Use $refresh-local-plugins to refresh my-plugin from /work/my-marketplace into /absolute/codex/home.
```

The standalone helper is `scripts/install-local.mjs` under the loaded skill's
directory. It accepts `--repo <checkout>` (defaulting to the current directory),
`--plugin <name>` selections, a required absolute `--target-home`, `--dry-run`,
and `--help`. It needs Node.js 22 or newer and Codex, and uses only Node built-ins.
The repository's development commands retain the Node.js 24 requirement.

Manifest discovery follows Codex's precedence: `.agents/plugins/marketplace.json`,
then `.agents/plugins/api_marketplace.json`. Selected entries must have local sources,
resolved from the marketplace root. Preflight checks an existing marketplace
registration against that checkout and fails on a same-name different-root
conflict; it does not silently rebind the marketplace. The source checkout
must be outside the installed plugin cache.

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

Install dependencies with `npm ci` to configure Husky's local Git hooks. Before
each push, `.husky/pre-push` runs `npm run verify` and then
`npm run test:installed -- --plugin all --package-only`. A failed check blocks
the push. The hook requires the same Node.js, Rust, Python, and Codex runtimes
as those commands. Model evaluations remain in the explicit release gate. Hook
trust is verified headlessly during installed checkpoints.
