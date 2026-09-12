# One-Person Labs Codex plugins

This repository is a local Codex plugin marketplace with source-first testing.
Canonical shipping bundles live in `plugins/`; tests and product source stay
outside those roots so an installed-copy comparison can prove exactly what is
shipped.

Use [$debug](plugins/opl/skills/debug/SKILL.md) from the `opl` plugin for
debugging. It replaces `diagnosing-bugs` in Matt Pocock Skills and
`systematic-debugging` in Superpowers Lite. Superpowers Lite retains
`verification-before-completion`.

OPL's [compatibility checker](plugins/opl/compatibility/README.md) reports
conflicting enabled components and repository requirements for plugins, skills,
and MCP servers, with optional session acknowledgments.

For an ordinary change, validate only the affected plugin:

```bash
npm run test:contract -- --plugin opl
npm run test:unit -- --plugin opl
```

For a skill change, add only that skill's behavioral smoke cases:

```bash
npm run eval:smoke -- --plugin opl --skill session-reader
```

At a package checkpoint, clean-install only the changed plugin into the
isolated black-box profile:

```bash
npm run test:installed -- --plugin opl
```

To update a consumer Codex home, use the explicit installation-only command:

```bash
npm run install:local -- --plugin opl --target-home /absolute/path/to/codex-home
```

That command performs no tests and no skill evaluations. `--plugin all` is an
explicit opt-in for installing the complete marketplace. The full skill corpus
runs only under `npm run release:verify`.

With OPL installed, use
[$refresh-local-plugins](plugins/opl/skills/refresh-local-plugins/SKILL.md) from
any local Codex marketplace checkout. For example: "Use
$refresh-local-plugins to refresh `my-plugin` from `/work/my-marketplace` into
`/absolute/path/to/codex-home`." The skill and `install:local` share the bundled
installer, which uses native `codex plugin add` to refresh and enable selected
plugins without changing their versions, then trusts their current installed
hooks through Codex's API. No terminal, sign-in, or sandbox setup is needed for
this operation. Add `--dry-run` to the command above
to preview the sources, selection, and destination.

Run `npm ci` to install the Husky pre-push hook. It runs the repository's
deterministic suite and package/discovery checks locally before each push.

See [Local plugin development](docs/local-plugin-development.md) for the command
matrix, authoring/black-box isolation, automatic hook trust, and release
gates. The design rationale is in
[the research report](docs/research/codex-plugin-local-development-workflow.md).
