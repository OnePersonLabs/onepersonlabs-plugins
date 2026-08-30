# One-Person Labs Codex plugins

This repository is a local Codex plugin marketplace with source-first testing.
Canonical shipping bundles live in `plugins/`; tests and product source stay
outside those roots so an installed-copy comparison can prove exactly what is
shipped.

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

See [Local plugin development](docs/local-plugin-development.md) for the command
matrix, authoring/black-box isolation, hook trust continuation, and CI/release
gates. The design rationale is in
[the research report](docs/research/codex-plugin-local-development-workflow.md).
