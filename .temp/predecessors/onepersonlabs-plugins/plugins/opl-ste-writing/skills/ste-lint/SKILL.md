---
name: ste-lint
description: Lint files, directories, globs, or stdin for mechanical ASD-STE100 Simplified Technical English issues with an ESLint-like CLI. Use when asked to check, lint, validate, or fix technical prose, documentation, READMEs, release notes, error messages, or comments for STE rules, including requests that use --ignore-pattern, --fix, or --fix-dry-run.
---

# STE Lint

Run the bundled linter and pass CLI arguments through without reinterpretation:

```bash
python3 <skill-directory>/scripts/ste-lint.py [options] file [file ...] [directory ...]
```

Infer omitted targets from the session context. For example, use the files the user named, the files changed in the current task, or `.` when the user clearly requests a repository-wide lint. Preserve explicit arguments exactly. Put `--` before a target that starts with `-`.

The script supports recursive directories and globs, repeatable `--ignore-pattern`, `--no-ignore`, `--fix`, `--fix-dry-run`, `--format stylish|json`, and `--ext`. Run it with `--help` for the complete interface. Exit status `0` means clean, `1` means lint findings, and `2` means a usage or file error.

## Fix workflow

Treat `--fix` and `--fix-dry-run` as agent workflows because a deterministic linter cannot safely rewrite prose.

1. Run the script with all requested arguments, including the fix flag.
2. Read the reported locations and rules.
3. For `--fix`, use `$ste-writing` to rewrite only the flagged prose in place. Preserve code, commands, identifiers, data, meaning, and surrounding formatting.
4. For `--fix-dry-run`, use `$ste-writing` to prepare the same edits, but do not write files. Show the proposed diff.
5. Run the linter again without the fix flag after an in-place fix. Continue until it passes or report findings that require user judgment.

Do not invoke `$ste-writing` when the first lint run has no findings. Do not claim that this mechanical lint certifies full ASD-STE100 compliance.
