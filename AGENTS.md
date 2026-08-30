# Repository Instructions

## Local plugin development

This repository uses the source-first, two-loop workflow in
`docs/local-plugin-development.md`. Plugin roots under `plugins/` contain only
shipping files. Tests live under `tests/`, product source lives under
`packages/`, and repository drivers live under `tools/`.

After each executable behavior edit, run the smallest finite focused test that
can prove the behavior. After it passes, run the deterministic suite for only
the affected plugin:

```bash
npm run test:contract -- --plugin <plugin-name>
npm run test:unit -- --plugin <plugin-name>
```

Cross capability boundaries only when the change crosses them:

- Skill instructions or activation metadata: run
  `npm run eval:smoke -- --plugin <plugin-name> --skill <skill-name>`.
- MCP launcher or server metadata: run
  `npm run test:mcp -- --plugin <plugin-name>`.
- UI code or resources: run `npm run test:ui -- --plugin <plugin-name>`.
- Package-visible files at a coherent checkpoint: run
  `npm run test:installed -- --plugin <plugin-name>`.

`test:installed` uses a separate black-box Codex home and installs only the
selected plugin. If it exits with status 78, open the printed Codex command,
review the plugin in `/hooks`, and ask the user to reply `done`. After that
confirmation, resume with the same command plus `--resume-after-trust`; the
resume path verifies the existing installed copy and does not reinstall it.

`npm run install:local -- --plugin <plugin-name> --target-home <path>` is an
installation-only consumer operation. It never runs unit tests, contract
checks, installed checks, or skill evaluations. Use `--plugin all` only when
the user explicitly asks to install every marketplace plugin. Never choose a
user's default `~/.codex` implicitly; require the target home.

The full skill corpus is not a routine update check. Only the explicit
`npm run release:verify` release gate runs clean installed checks for every
plugin and behavioral evaluations for every shipped skill. `npm run verify`
runs the complete deterministic repository gate without model evaluations.

Do not add timestamp cachebusters to plugin versions and do not restore the
retired all-plugin reinstall script. Codex's installed cache is tested only at
the black-box checkpoint or used by the explicit installation command.
