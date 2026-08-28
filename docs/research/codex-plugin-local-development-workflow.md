# Evidence-backed local development workflow for Codex plugin repositories

Date: 2026-08-28

## Scope and conclusion

This report treats the repository as a greenfield local clone. It deliberately does not inspect or derive recommendations from the repository's current plugin, test, hook, install, or CI configuration. Sources are OpenAI's current official documentation, the first-party Model Context Protocol (MCP) specification/tooling, and first-party test-runner documentation.

**Recommendation (synthesis): use a layered, two-loop architecture with separate authoring and black-box Codex environments.** Run a fast source loop for every deterministic red-green-refactor step, and a slower clean installed-plugin loop at coherent checkpoints. Do not reinstall the plugin after every edit. This follows from two documented facts: OpenAI says to test each capability before testing the complete installed plugin, and a local marketplace install is copied into a plugin cache from which the host loads it rather than being executed from the source directory. ([Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt), [package plugins](https://developers.openai.com/plugins/build/plugins#how-local-marketplaces-work))

“Optimal” here means a **Pareto design for fast feedback, package fidelity, isolation, and debuggability under Codex's documented cache/trust/reload constraints**, not a universal productivity theorem. Controlled TDD experiments have found context-dependent or small effects: one experiment with professional pairs reported more passed black-box tests but more development time, while a later family of controlled experiments found no statistically significant productivity or external-quality differences from micro-iterative test-last development. ([George and Williams controlled experiment](https://doi.org/10.1016/j.infsof.2003.09.011), [Pančur and Ciglarič controlled experiments](https://doi.org/10.1016/j.infsof.2011.02.002))

The practical result is:

1. **Authoring inner loop:** deterministic contract/unit tests, direct hook-script tests, source-local standalone skill evaluation, MCP tests against the source server, and UI tests against a local MCP Apps host. The candidate installed plugin stays disabled/uninstalled in the authoring profile.
2. **Black-box checkpoint loop:** use a separate Codex state/profile, clean install from the local marketplace, inspect the returned installed path, open a fresh Codex session from controlled fixture directories, run installed-bundle smoke tests and model evaluations, and review hook trust when applicable.
3. **Release loop:** repeat the clean install in each supported host, run the full evaluation corpus, test authentication/authorization and UI in developer mode, and exercise publication-specific checks.

This design gives frequent TDD feedback without pretending that source-only tests prove packaging, cache, trust, metadata refresh, or host integration.

## Facts the official documentation establishes

- A plugin can contain skills, an MCP server, both, optional MCP-backed UI, and Codex-only hooks. OpenAI recommends starting with the smallest shape that supports the use case and adding server or UI capability only when needed. ([Plugin architecture](https://developers.openai.com/plugins/concepts/plugins))
- Every plugin has `.codex-plugin/plugin.json`; component paths are relative to the plugin root, begin with `./`, and must remain inside the root. Optional top-level components include `skills/`, `.mcp.json`, `.app.json`, `hooks/`, and assets. ([Plugin structure and path rules](https://developers.openai.com/plugins/build/plugins#plugin-structure))
- OpenAI's test workflow explicitly separates capability testing from testing the installed whole. It prescribes retained evaluation prompts/results and direct, indirect, follow-up, negative, and boundary cases. ([Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt))
- Local marketplace installs are copied to `~/.codex/plugins/cache/$MARKETPLACE_NAME/$PLUGIN_NAME/$VERSION/`; local installs use version `local`, and the host loads the cached installed copy, not the marketplace source. ([How local marketplaces work](https://developers.openai.com/plugins/build/plugins#how-local-marketplaces-work))
- Codex's stable plugin CLI can add, list, and remove plugins. `add --json` returns `installedPath`; `list --json` reports installed/enabled/source state; `remove` deletes local config and the cached install. There is no documented `reinstall` subcommand. ([Codex plugin CLI](https://learn.chatgpt.com/docs/developer-commands?surface=cli#cli-codex-plugin))
- Bundled skills and tools become available in a new chat or CLI session after installation. Plugin bundles are supported in the ChatGPT desktop app and Codex CLI, but not in the IDE extension; standalone skills are supported in the IDE. ([Use plugins](https://learn.chatgpt.com/docs/plugins))
- Codex automatically detects changes to standalone local skills and follows symlinked skill folders. A restart is the fallback when a change does not appear. Duplicate skill names are not merged and both can appear. ([Build skills](https://learn.chatgpt.com/docs/build-skills))
- Plugin hooks execute with `PLUGIN_ROOT` pointing to the installed plugin root and `PLUGIN_DATA` pointing to writable plugin data. Installing or enabling a plugin does not trust its hooks. Trust is tied to the current hook-definition hash, so a changed definition is skipped until it is reviewed in `/hooks`. ([Hooks](https://learn.chatgpt.com/docs/hooks), [bundled hooks](https://developers.openai.com/plugins/build/plugins#bundled-mcp-servers-and-lifecycle-hooks))
- MCP servers should be tested locally at a Streamable HTTP endpoint, typically `/mcp`, with MCP Inspector before connecting them to ChatGPT developer mode. Metadata changes require a server restart/deploy, connection **Refresh**, and a new conversation. ([Build an MCP server](https://developers.openai.com/plugins/build/mcp-server#run-and-test-locally), [connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt#refresh-metadata))
- MCP UI runs in a sandboxed iframe over the MCP Apps bridge. Tools should remain useful without UI. During development the bundle can be rebuilt and the server hot-reloaded; the resource URI is a cache key and should change for breaking HTML/JavaScript/CSS changes. ([Add UI](https://developers.openai.com/plugins/build/chatgpt-ui))
- `AGENTS.md` is loaded once per Codex run/TUI session and is the official repository-scoped place to encode durable test commands and verification expectations. ([AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md))
- `codex exec --ephemeral --json` is designed for scripts and CI and emits JSONL events including agent messages, MCP calls, commands, errors, and turn status. Its default sandbox is read-only. ([Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode))

## Viable architectures compared

| Architecture | Fast TDD | Installed fidelity | Main defect |
|---|---:|---:|---|
| Install after every edit | Poor | High | Every iteration pays copy/cache, new-session, and possibly hook-trust costs. A changed source tree is not the executing tree. |
| Source-only tests | Excellent | Low | Cannot prove manifest paths, cached bundle contents, installed `PLUGIN_ROOT`, plugin enablement, host discovery, or stale metadata behavior. |
| MCP developer-mode only | Good for server/UI | Medium | Does not prove skills, hooks, plugin manifest, marketplace installation, or combined workflows. |
| **Layered source + clean-install checkpoints** | **Excellent** | **High at gates** | Requires maintaining explicit layers, but each failure is localized and the expensive layer runs only when it adds evidence. |

The last row is the optimal engineering synthesis. OpenAI itself instructs builders to test MCP independently, then skills, then the complete locally installed plugin. ([Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt))

## Recommended greenfield repository shape

The exact names are a proposal, not an OpenAI requirement:

```text
AGENTS.md
package.json                  # one finite command surface for Codex
plugins/
  <plugin-name>/              # canonical shipping source only
    .codex-plugin/plugin.json
    skills/<skill>/SKILL.md
    hooks/hooks.json          # only when hooks are necessary
    .mcp.json | .app.json     # only when applicable
    assets/
mcp/                          # server packages, if applicable
ui/                           # MCP Apps packages, if applicable
tests/
  contracts/                  # manifest, paths, metadata, annotation checks
  fixtures/hooks/             # stdin events and expected outputs
  evals/<plugin>.jsonl        # behavioral prompt corpus and rubrics
  installed/                  # clean-cache/package smoke harness
dev-host/
  .agents/skills/             # source symlinks for standalone skill iteration
tools/                        # validation, eval, and clean-install drivers
.agents/plugins/marketplace.json
```

Keep tests and developer tooling outside each shipping plugin root unless they are runtime resources. This makes the tested runtime inventory explicit and avoids silently packaging test fixtures. The marketplace entry should point at the canonical plugin directory; the required marketplace location and relative-path rules are documented by OpenAI. ([Package plugins](https://developers.openai.com/plugins/build/plugins#marketplace-metadata))

Use one command façade even if implementations are polyglot. For example:

```text
test:focus       one finite, targeted test command after each edit
test:unit        all deterministic unit tests for the affected package
test:contract    plugin/skill/hook/MCP metadata and path contracts
test:mcp         start source server and run Inspector CLI cases
test:ui          component/browser tests against a test host
eval:smoke       small, fresh-session behavioral corpus
test:installed   clean local install and installed-path smoke checks
verify           complete deterministic PR gate
```

For a TypeScript MCP/UI repository, Vitest is a reasonable default because its development mode reruns affected tests in watch mode, while CI uses run mode. A Codex agent should normally invoke finite targeted runs so it receives a definitive exit status; a human pairing alongside Codex can keep watch mode open. ([Vitest features](https://vitest.dev/guide/features), [Vitest CLI](https://vitest.dev/guide/cli))

## The tight red-green-refactor loop

Use **TDD only for deterministic code and contracts**: parsers, validators, handlers, hook I/O, path resolution, builds, and UI state. Use **evaluation-driven development (EDD)** for probabilistic model behavior: skill activation, tool choice, workflow adherence, and response quality. Label golden prompts by positive/negative, direct/indirect, incomplete/follow-up, boundary, and risk class. Track activation precision and recall, expected-tool/sequence pass rate, rubric pass rate, false-positive rate on negative prompts, and confirmation compliance; do not call an exact prose snapshot a unit test. OpenAI prescribes the case categories and retained results but does not prescribe these metrics or thresholds. ([Skill testing](https://developers.openai.com/plugins/build/skills#test-the-skill), [connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt))

The deterministic loop is synthesis tailored to Codex as the developer:

1. **Choose one deterministic observable behavior.** Add the smallest failing test first. For a model-facing change, add or label the corresponding golden eval case, but treat its result as an EDD measurement rather than a deterministic RED assertion.
2. **RED.** Run only the new or nearest test with a finite command. Confirm the failure is caused by the missing behavior, not setup or stale installed state. Save that result in the Codex transcript.
3. **GREEN.** Make the minimum source change and rerun the same command immediately.
4. **REFACTOR.** Improve structure with the focused test still green, then run all deterministic tests for the affected capability.
5. **Cross a boundary only when the change crosses one.** Run MCP Inspector after server registration/schema/transport changes; run UI browser tests after UI changes; run skill eval smoke after instruction/description changes; run hook fixture tests after hook-handler changes.
6. **Checkpoint.** When a coherent behavior is complete, run contracts plus a clean installed-plugin smoke test. Run the full model eval corpus before merge/release, not on every syntax edit.

Encode this policy and the exact commands in the root `AGENTS.md`: “after each behavior edit, run the smallest relevant finite test; prove the new test fails before implementation; after green, run the affected capability suite; run `test:installed` when package-visible files change.” Codex loads these instructions at session start, so start a new Codex run after changing the policy. ([AGENTS.md discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md#how-codex-discovers-guidance))

## Capability-specific test design

### Static package contracts

Run these on every relevant edit because they require no model, host, network, install, or trust UI:

- Parse every manifest and hooks file.
- Assert required identity fields and the documented component layout.
- Resolve every manifest path and every `SKILL.md` reference; reject missing files, absolute paths, `..` escapes, case collisions, and broken symlinks.
- Assert skill directory/frontmatter name consistency, nonempty descriptions, and deliberately scoped activation descriptions.
- Assert hook commands reference installed paths via `PLUGIN_ROOT` rather than assuming the source checkout.
- Assert MCP tool names are unique, schemas are valid, annotations describe real behavior, and destructive/open-world operations are not mislabeled read-only.
- Build every shipping script and UI bundle from a clean dependency install.

These checks implement documented package, skill, hook, and tool requirements. OpenAI does not publish a general local plugin-manifest validator, so a repository validator is useful but should be treated as a fast approximation; an actual `codex plugin add` remains the authoritative packaging smoke test. ([Package fields and paths](https://developers.openai.com/plugins/build/plugins#manifest-fields), [MCP tool definitions](https://developers.openai.com/plugins/build/mcp-server#define-tools-from-user-goals))

### Skills

Use a neutral `dev-host` whose `.agents/skills/<name>` entries symlink to canonical plugin skill directories. Run Codex from that host with the packaged plugin disabled/uninstalled so duplicate names cannot influence activation. Codex officially supports repo-local and symlinked skills, automatically detects changes, and warns that same-named skills are not merged. ([Local skills](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills))

Keep a versioned eval row for each use-case inventory item:

```json
{
  "prompt": "...",
  "should_activate": true,
  "expected_tools": ["..."],
  "must_do": ["..."],
  "must_not_do": ["..."],
  "requires_question": false,
  "risk": "read-only"
}
```

Grade activation separately from workflow/output quality: OpenAI recommends fixing the description when activation is wrong and the instruction body when the selected workflow is inconsistent. Preserve prompts and observed results across revisions. ([Skill testing](https://developers.openai.com/plugins/build/skills#test-the-skill), [plugin evaluation records](https://developers.openai.com/plugins/deploy/connect-chatgpt))

A small runner can execute each case in a fresh `codex exec --ephemeral --json` session and inspect tool-call and message events. This runner is a synthesis, not an official plugin test framework. Keep the model and reasoning settings fixed within a comparison, score semantic requirements instead of exact prose, and repeat only the higher-value behavioral cases to detect model variability.

### Hooks

Put behavior in a pure function/module and keep the executable as a thin adapter. A unit harness should:

1. Pipe a documented event fixture as one JSON object on stdin.
2. Set `PLUGIN_ROOT` to a read-only fixture tree and `PLUGIN_DATA` to a temporary writable directory.
3. Set the process cwd arbitrarily; never leave it implicitly equal to the source repository.
4. Assert stdout JSON, stderr, exit status, files written, and absence of unintended external effects.
5. Cover matching/non-matching events, malformed input, timeout, large output, missing dependency, and platform-specific command selection.

That harness follows the documented hook command contract and environment without loading a plugin into Codex. ([Hook input/output](https://learn.chatgpt.com/docs/hooks#common-input-fields), [plugin hook environment](https://learn.chatgpt.com/docs/hooks#plugin-bundled-hooks))

**Hook cwd contract:** Codex runs hook commands with the session cwd. For plugin hooks, executable and read-only resource paths must resolve through the installed `PLUGIN_ROOT`, mutable state must go under `PLUGIN_DATA`, and the event's `cwd` is user/work context only -- not the plugin location. Run both fixture and installed-host hook cases from the plugin repository, a nested directory, an unrelated repository, a no-Git temporary directory where the host permits it, and a path containing spaces. Add WSL/Linux and native Windows `commandWindows` cases when both are claimed targets. Passing only when cwd is the source repository is not an installed-plugin pass. ([Hook command execution](https://learn.chatgpt.com/docs/hooks#config-shape), [plugin hook environment](https://learn.chatgpt.com/docs/hooks#plugin-bundled-hooks))

Only after direct tests pass should the installed-host test invoke the hook. Review the exact installed definition in `/hooks`; changed definitions are skipped until trusted. OpenAI documents `--dangerously-bypass-hook-trust` only for one-off automation that already vets sources. Do not make it the normal developer profile or CI default. ([Review and trust hooks](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks))

### MCP server

Separate tool registration/transport from pure handlers and service adapters. Unit-test authorization, validation, retries, idempotency, errors, and output minimization with fakes. Then run the server from source and use the first-party Inspector CLI for initialization, `tools/list`, strict schema portability checks, and representative `tools/call` cases. Inspector's CLI is explicitly intended for scripting/automation and emits machine-readable output and stable nonzero failure classes. ([Inspector CLI](https://github.com/modelcontextprotocol/inspector/blob/main/clients/cli/README.md))

Example checkpoint commands, with the Inspector pinned in the lockfile rather than fetched as `latest` in CI:

```bash
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:3000/mcp \
  --transport http --method initialize --format json
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:3000/mcp \
  --transport http --method tools/list --strict --format json
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:3000/mcp \
  --transport http --method tools/call --tool-name example \
  --tool-args-json '{"id":"fixture-1"}' --format json
```

For private local servers, ChatGPT developer-mode testing requires a public HTTPS endpoint or Secure MCP Tunnel, while Inspector can use localhost. After any tool name, description, schema, annotation, auth, or UI-resource change, restart the server, refresh the developer-mode connection, confirm the advertised metadata, and start a new conversation. ([Connect an MCP server](https://developers.openai.com/plugins/deploy/connect-chatgpt#test-an-mcp-server-optional))

### Optional UI / apps

Test data tools without UI first. Test UI state/reducers and bridge-message handling as ordinary code, then render the component in the first-party MCP Apps basic host or an equivalent test host. The MCP Apps project includes a development host, and its own first-party suite uses Playwright E2E tests and screenshot comparisons. ([MCP Apps test host](https://modelcontextprotocol.io/extensions/apps/build#testing-with-the-basic-host), [MCP Apps testing](https://github.com/modelcontextprotocol/ext-apps/blob/main/CONTRIBUTING.md#testing))

Use Playwright for iframe interaction, keyboard/accessibility behavior, responsive states, host-context changes, CSP/network failures, console errors, state restoration, and visual snapshots. Its UI mode supports targeted watch runs, DOM snapshots, console/network inspection, and time-travel traces; retain traces on CI failure. ([Playwright UI mode](https://playwright.dev/docs/test-ui-mode), [trace viewer](https://playwright.dev/docs/trace-viewer-intro))

Rebuild and hot-reload the local server in the inner loop. Bump the `ui://...` resource URI when a breaking asset/template change could be hidden by host caching. Keep the tool's structured/model-readable result sufficient for headless completion. ([OpenAI UI development](https://developers.openai.com/plugins/build/chatgpt-ui#bundle-for-the-iframe))

## Clean installed-plugin checkpoint

The following algorithm is engineering synthesis from the documented CLI and cache semantics:

1. Run deterministic source tests and build all runtime artifacts.
2. Create a dedicated black-box Codex profile or temporary `CODEX_HOME` for package installation so unrelated installed plugins, hooks, and config cannot affect the result. Keep the authoring session on a different profile with the candidate installed plugin disabled/uninstalled; this prevents the plugin under test from altering the agent that is editing it.
3. Add/list the local marketplace and verify the resolved root.
4. Remove the previous candidate install, then add it again with `--json`. This is the deterministic substitute for the undocumented atomic reinstall operation.
5. Read `installedPath` from the JSON response. Run the same package contracts against that path and compare a generated SHA-256 digest inventory of intended runtime files with source/build outputs.
6. Use a new Codex CLI session. Confirm the plugin is installed and enabled, then run a small positive/negative eval smoke set across a working-directory matrix: plugin root, nested directory, unrelated repository, and a clean temporary Git repository.
7. If hooks are present, review trust before the hook smoke case. If MCP is present, confirm server initialization and required auth. If UI is present, verify the installed workflow in a real supported host.

`CODEX_HOME` isolation is **state separation only**. It does not normalize current working directory, inherited environment, executable lookup, ports, service state, network, or filesystem permissions. The working-directory matrix must also cover missing environment variables, unavailable dependencies/services, and port or service-name collisions. Hook commands should use the documented installed `PLUGIN_ROOT`. Bundled MCP executables and resources should locate themselves relative to the module/script (`import.meta.url`, `__dirname`, or Python `__file__`) or a stable installed executable, never `process.cwd()`. MCP stdio configuration does support an optional explicit `cwd`, but use it only when the packaged value is portable. Official plugin docs establish `PLUGIN_ROOT` for hooks; they do not establish installed-root interpolation, an equivalent environment variable, or a default cwd contract for bundled MCP processes. ([Plugin hook environment](https://developers.openai.com/plugins/build/plugins#bundled-mcp-servers-and-lifecycle-hooks), [MCP `cwd` configuration](https://learn.chatgpt.com/docs/config-file/config-reference))

The key commands are documented, though their orchestration is not:

```bash
codex plugin marketplace add /absolute/path/to/marketplace-root --json
codex plugin marketplace list --json
codex plugin remove plugin-name@marketplace-name --json
codex plugin add plugin-name@marketplace-name --json
codex plugin list --json
```

`remove` is destructive only to the selected installed plugin's local config/cache, so scripts must resolve and print the exact plugin/marketplace identity before invoking it. ([Codex plugin CLI](https://learn.chatgpt.com/docs/developer-commands?surface=cli#cli-codex-plugin))

Do not use a source/cache symlink as the shipping test. OpenAI documents a copied cached install, not a live-linked development install. A symlink can be useful only for standalone skill authoring, where it is explicitly supported. ([Plugin cache](https://developers.openai.com/plugins/build/plugins#how-local-marketplaces-work), [skill symlinks](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills))

## Reload, restart, cache, and trust matrix

| Changed surface | Required action supported by documentation | Recommended deterministic test action |
|---|---|---|
| Standalone repo skill | Auto-detected; restart if it does not appear | Fresh `codex exec` case from neutral skill host |
| Installed plugin files | Host runs cache copy; desktop docs say update source and restart app | Clean remove/add, verify `installedPath`, new session |
| Bundled skill/tool after install | Available to new chats/sessions | Never reuse an old evaluation conversation |
| `AGENTS.md` | Loaded once per run/TUI session | Start a new run after instruction changes |
| Hook definition | New hash is untrusted and skipped | Reinstall, inspect `/hooks`, trust, start hook smoke session |
| Hook implementation only | Docs do not say whether script bytes affect trust hash | Reinstall because installed `PLUGIN_ROOT` is stale; inspect `/hooks` rather than assume |
| MCP handler code | Restart/deploy server | Inspector initialization/call tests |
| MCP metadata/auth/UI resource | Restart server, Refresh connection, new conversation | Re-run affected tool-selection corpus |
| Breaking UI HTML/JS/CSS | Resource URI is a cache key | Build, bump URI, reload server, browser smoke |
| Published MCP metadata/skills | Reviewed/imported snapshots | Scan again, submit and publish a new version; not part of hot local TDD |
| Windows app agent mode | WSL/native switch needs app restart | Standardize one mode for a test run |

Sources: [skills](https://learn.chatgpt.com/docs/build-skills), [plugins](https://learn.chatgpt.com/docs/plugins), [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [hooks](https://learn.chatgpt.com/docs/hooks), [MCP refresh](https://developers.openai.com/plugins/deploy/connect-chatgpt#refresh-metadata), [UI cache key](https://developers.openai.com/plugins/build/chatgpt-ui), [Windows/WSL](https://learn.chatgpt.com/docs/windows/windows-app#windows-subsystem-for-linux-wsl).

## Debugging by boundary

Use the first failing boundary instead of repeatedly reinstalling:

1. **Focused unit/contract test fails:** fix source logic or metadata. Installation is irrelevant.
2. **Unit passes, Inspector fails:** inspect server process, transport, initialization, schema registration, auth, and raw result/error. The Inspector exposes tools, resources, schemas, notifications, and direct calls. ([MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector))
3. **Inspector passes, model chooses the wrong tool:** inspect names/descriptions/annotations and the positive/negative prompt corpus. Record selected tool, arguments, result, error, and confirmation behavior as OpenAI recommends. ([Tool-selection testing](https://developers.openai.com/plugins/deploy/connect-chatgpt#check-tool-selection))
4. **Source skill passes, installed skill fails:** compare the returned `installedPath` with source; check manifest paths, missing references, enabled state, duplicate skills, and whether the session predates installation.
5. **Hook direct test passes, runtime hook is absent:** check plugin enabled state, installed hook file, event matcher, feature state, `/hooks` source/status, current trust hash, and `PLUGIN_ROOT`. Do not infer success from installation alone. ([Hook discovery and trust](https://learn.chatgpt.com/docs/hooks#where-codex-looks-for-hooks))
6. **Tool result is correct but UI fails:** use the test host/Playwright trace to inspect bridge lifecycle, iframe console/network, CSP, resource MIME type/URI, and cached resource version.
7. **CLI and desktop disagree:** verify supported surface, active Codex home, install cache, agent mode, and new-session state. The IDE extension cannot run plugin bundles. ([Plugin surfaces](https://learn.chatgpt.com/docs/plugins#use-plugins-from-a-supported-surface))
8. **Only model evals are flaky:** preserve the exact prompt, model/reasoning configuration, selected tools/arguments, and result. Use semantic rubrics and a declared pass-rate policy rather than exact prose equality; official plugin docs mandate retaining results but do not define repetition counts or a flake threshold.

For Codex-internal instruction debugging, start Codex with a repository-local log directory and inspect its session/log output; the official AGENTS guide documents this diagnostic path. ([Verify AGENTS setup](https://learn.chatgpt.com/docs/agent-configuration/agents-md#verify-your-setup))

## WSL-specific recommendation

For a clone under `/home/...`, keep the hot loop inside WSL2 and run Codex/Node/Python there. OpenAI recommends WSL2 when the repository and tooling already live in Linux and recommends Linux-home storage rather than `/mnt/c` for performance and fewer symlink/permission problems. ([WSL](https://learn.chatgpt.com/docs/windows/wsl))

Treat the Windows desktop app and WSL CLI as separate test hosts unless deliberately configured otherwise: the Windows app uses `%USERPROFILE%\.codex`, while WSL CLI uses Linux `~/.codex` by default, so they do not automatically share config, authentication, caches, or sessions. If using the Windows app against this clone, select the WSL agent and restart the app; keep desktop acceptance installation separate and explicit. ([Windows app and WSL homes](https://learn.chatgpt.com/docs/windows/windows-app#share-config-auth-and-sessions-with-wsl))

## CI and release gates

Recommended synthesis:

### Pull requests

- Clean dependency install and build.
- Formatting/type/lint checks that catch actual defects.
- Static package contracts.
- Unit tests for scripts, hook core logic, MCP handlers, and UI logic.
- MCP Inspector CLI initialization, strict tool-list/schema, and fixture calls.
- Headless UI/Playwright tests when UI exists, with trace/screenshot artifacts on failure.
- Clean cached-install smoke using an isolated Codex home; assert `installedPath` and the installed runtime digest inventory.
- A small behavioral eval subset only when skill descriptions/instructions or tool metadata changed.

### Nightly or pre-release

- Full direct/indirect/incomplete/follow-up/negative/boundary corpus in fresh sessions.
- Repeated high-value model cases with stored model configuration and pass rates.
- Authentication/authorization, confirmation, retry/idempotency, empty/error, and rate-limit cases.
- Supported OS/host matrix, including native Windows only if it is a claimed target.
- Real ChatGPT/Codex developer-mode canary, UI console inspection, and a final hook trust review.

If model evals run in CI, use `codex exec`/the Codex GitHub Action with least privilege and isolate credentials from repository-controlled setup. A separate `CODEX_HOME` does not protect process environment: candidate plugin hooks, MCP launchers, build scripts, tests, dependency lifecycle hooks, or a compromised action may execute in the credential-bearing job. Never expose a Codex/OpenAI key as a job-level environment variable; OpenAI specifically warns that repository-controlled code can read it. ([Codex automation security](https://learn.chatgpt.com/docs/non-interactive-mode#authenticate-in-automation))

Do not let model-based evals replace deterministic tests. They answer different questions: deterministic tests prove contracts and logic; model evals measure activation, tool choice, workflow adherence, and output usefulness; clean install tests prove packaging and host discovery.

## Common failure modes the design prevents

- **False green from testing source while the host runs yesterday's cache:** clean reinstall plus installed-path inventory catches it.
- **Slow TDD caused by packaging every edit:** source-first tests eliminate irrelevant cache/restart work.
- **Hook appears broken after install:** `/hooks` exposes that the changed definition is untrusted and skipped.
- **Skill works only when explicitly named:** indirect positive cases test description quality.
- **Skill over-triggers:** negative and out-of-scope cases are first-class tests.
- **MCP handler is correct but never callable:** Inspector initialization and `tools/list` distinguish registration/transport from handler logic.
- **Metadata fix appears ineffective:** server restart, connection Refresh, and new conversation remove stale developer-mode state.
- **UI works in a browser tab but not a host iframe:** MCP Apps host tests exercise the bridge, sandbox, CSP, and resource contract.
- **Installed reference/script path breaks:** contracts rerun against `installedPath`, and hooks use installed `PLUGIN_ROOT`.
- **Another plugin or repo instruction changes results:** neutral fixture host, dedicated profile, one candidate plugin, and fresh sessions reduce contamination.
- **CLI passes but IDE fails:** the IDE is not a supported plugin-bundle host; test standalone skills there, installed bundles in CLI/desktop.
- **WSL CLI and Windows app see different plugins:** explicit per-host homes/installations prevent accidental assumptions about shared cache.

## Material gaps and uncertainties in official documentation

These should remain explicit rather than filled with folklore:

1. OpenAI documents no atomic local `reinstall` or live-linked plugin-development command. Clean `remove` + `add` is an inference from documented cache and CLI behavior.
2. Desktop docs say to update the pointed-to local directory and restart so changes are picked up, but do not specify the exact cache recopy algorithm. Verify the installed copy when determinism matters.
3. There is no documented general-purpose local plugin-manifest linter/validator. Repository contract tests are necessarily an approximation until actual install/submission.
4. OpenAI prescribes eval categories and recordkeeping but no canonical local plugin-eval runner, grading file format, repetition count, statistical threshold, or flake policy. A `codex exec --json` harness is a practical synthesis.
5. Hook trust is documented against the hook-definition hash; the docs do not establish whether changing only a referenced script changes that trust hash. The installed script is still stale until the plugin cache is refreshed.
6. Documentation clearly requires a new session after installation and metadata refresh, but does not promise hot reload of complete installed plugins.
7. Public submission requires a stable public HTTPS MCP endpoint; Secure MCP Tunnel is for developer-mode testing and does not prove deployability. ([MCP deployment](https://developers.openai.com/plugins/build/mcp-server#deploy-the-endpoint))
8. Capabilities can be surface-specific. A single CLI run does not prove desktop/web/mobile UI or auth behavior, and the IDE extension does not support plugin bundles.
9. General MCP stdio config has an optional `cwd`, but official plugin docs do not define bundled-MCP default cwd, promise `PLUGIN_ROOT`, or document portable installed-root interpolation. Self-relative lookup and the black-box cwd matrix are engineering synthesis.
10. Separate authoring/black-box profiles reduce state contamination but are not a documented security boundary. They do not isolate environment, services, ports, or host resources.

## Primary sources

- OpenAI: [Plugin architecture](https://developers.openai.com/plugins/concepts/plugins), [package plugins](https://developers.openai.com/plugins/build/plugins), [connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt), [build skills](https://developers.openai.com/plugins/build/skills), [build MCP server](https://developers.openai.com/plugins/build/mcp-server), [add UI](https://developers.openai.com/plugins/build/chatgpt-ui)
- OpenAI Codex: [use plugins](https://learn.chatgpt.com/docs/plugins), [local skills](https://learn.chatgpt.com/docs/build-skills), [hooks](https://learn.chatgpt.com/docs/hooks), [plugin CLI](https://learn.chatgpt.com/docs/developer-commands?surface=cli#cli-codex-plugin), [non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode), [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [WSL](https://learn.chatgpt.com/docs/windows/wsl)
- Model Context Protocol: [Inspector](https://modelcontextprotocol.io/docs/tools/inspector), [Inspector CLI](https://github.com/modelcontextprotocol/inspector/blob/main/clients/cli/README.md), [MCP Apps development host](https://modelcontextprotocol.io/extensions/apps/build#testing-with-the-basic-host), [MCP Apps test suite](https://github.com/modelcontextprotocol/ext-apps/blob/main/CONTRIBUTING.md#testing)
- Test tooling: [Vitest watch/run behavior](https://vitest.dev/guide/features), [Playwright UI mode](https://playwright.dev/docs/test-ui-mode), [Playwright traces](https://playwright.dev/docs/trace-viewer-intro)
