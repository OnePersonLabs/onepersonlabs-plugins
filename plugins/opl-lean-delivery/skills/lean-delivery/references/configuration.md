# Repository configuration

Read this reference when `$lean-delivery configure` is invoked or when the
bundled reader reports absent, incomplete, or invalid repository policy.

## Ownership and location

The plugin owns the schema. The repository owns and reviews its values. Resolve
the Git root and use exactly:

```text
<git-root>/.agents/lean-delivery.toml
```

Do not place these settings in `.codex/config.toml`; that file belongs to the
Codex configuration schema. Do not search above the Git root. Outside a Git
repository, Git settings are unavailable and no commit or worktree may be
inferred.

## Schema version 1

```toml
schema_version = 1

[git]
commit = "auto"
dirty_worktree = "ask-on-conflict"
worktree = "adaptive"

[delegation]
mode = "adaptive"

[review]
max_repair_cycles = 1

[verification]
full_gate = "pre-review-and-closure"
```

Supported values:

- `git.commit`: `auto`, `ask`, or `never`.
- `git.dirty_worktree`: `ask-on-conflict`, `path-only`, or `require-clean`.
- `git.worktree`: `adaptive`, `always`, or `never`.
- `delegation.mode`: `adaptive`, `always`, or `never`.
- `review.max_repair_cycles`: an integer from 1 through 3.
- `verification.full_gate`: `closure-only` or
  `pre-review-and-closure`.

The bundled reader rejects unknown keys, malformed TOML, invalid types or
values, and unsupported schema versions. An invalid file grants no authority.

## Configure and recover

For `$lean-delivery configure`, run the reader first. Show the current effective
values and errors. Ask only for values that are missing or that the user asked
to change, using the supported choices above, then update the repository file
without replacing unrelated valid settings.

During ordinary delivery, defer a question until its setting controls the next
consequential action. Continue safe discovery, capsule construction, focused
tests, and other work independent of that choice. Before the boundary:

- ask for a missing delegation setting before spawning delivery agents;
- ask for a missing worktree setting before creating a worktree;
- ask for missing review or verification settings before choosing that loop or
  gate;
- ask for missing Git commit settings before staging or committing.

When the user chooses a repository policy, persist it only when the user
authorizes the configuration edit. A one-task override governs only the current
task and does not silently rewrite the file. After an edit, rerun the reader and
require `status: "valid"` before using the configured authority.
