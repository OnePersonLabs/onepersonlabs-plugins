---
name: long-command-wakeup
description: Run a demonstrably long, unattended local command without repeated model polling, then resume the current Codex thread once through `codex queue`. Use for tests, builds, benchmarks, migrations, or noninteractive CLI workers expected to run longer than about two minutes; do not use for short, interactive, approval-dependent, destructive, or natively waitable work.
---

# Long command wakeup

Replace model-mediated polling with one detached command watcher and one bounded
completion message.

## Qualify the command

Use this workflow only when repository evidence or measured history supports an
expected runtime above roughly 120 seconds. A familiar command name is not
evidence. Prefer a supported native completion notification or server-side wait
when one exists; in particular, do not wrap native subagents that already expose
a bounded wait mechanism.

The command must be safe to continue after the current turn ends. Keep
interactive commands, approval-dependent work, destructive operations, and jobs
requiring live supervision in the foreground. Consolidate related parallel work
behind one coordinator command and register at most one wakeup per thread turn.

## Launch once

Resolve the exact loaded skill directory and use its
`scripts/run_and_wake.py`; do not copy the helper into the target repository.
Select Python 3.11 or newer: `python` on Windows and `python3` on POSIX, honoring
`PYTHON_BIN` when set. Verify the interpreter and helper before launch.

Choose a safety timeout appropriate to the operation. It is a guard, not an
estimate. Pass the program and arguments separately after `--`; do not build
them from untrusted text or use `eval`. If shell syntax is genuinely necessary,
pass the platform shell as the explicit program and use a fixed, reviewed
command string.

```text
<python> -B -X utf8 <skill>/scripts/run_and_wake.py start \
  --timeout-seconds <seconds> \
  --cwd <working-directory> \
  -- <program> <arguments...>
```

The helper resolves the current thread from `CODEX_THREAD_ID`; pass `--thread`
only when an explicit thread id is already known. It verifies `codex queue`
before launching, starts one detached worker, and prints a JSON receipt with the
worker PID, timeout, and result directory. Report that receipt and end the turn.
Do not poll the process, its logs, or its status file.

## Resume once

The worker writes `status.json`, `stdout.log`, `stderr.log`, and `queue.log`, then
queues one message after success, failure, launch failure, or timeout. The queued
message contains no command output.

When that message arrives, inspect the four artifacts once. Treat only
`state: success` with exit code zero as command success; a queued message proves
delivery, not command success. Continue the original task from this evidence.

If queue delivery fails, the artifacts remain in the reported directory but no
polling fallback runs. When the user later returns, inspect them once; if the job
is somehow still running, report that fact and stop again. Do not modify Codex
configuration or model instructions to force this workflow.
