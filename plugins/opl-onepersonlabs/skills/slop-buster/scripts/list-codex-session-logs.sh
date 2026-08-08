#!/usr/bin/env bash
set -euo pipefail

session_root="${CODEX_HOME:-$HOME/.codex}/sessions"
newer_than_log=""

if [[ "$#" -gt 2 ]]; then
  printf 'Usage: %s [--newer-than-log <codex-session-log.jsonl>]\n' "$0" >&2
  exit 2
fi

if [[ "$#" -eq 2 ]]; then
  if [[ "$1" != "--newer-than-log" ]]; then
    printf 'Unknown option: %s\n' "$1" >&2
    exit 2
  fi
  newer_than_log="$2"
fi

if [[ ! -d "$session_root" ]]; then
  printf 'Codex session directory does not exist: %s\n' "$session_root" >&2
  exit 1
fi

if [[ -n "$newer_than_log" && ! -f "$newer_than_log" ]]; then
  printf 'newer-than log does not exist: %s\n' "$newer_than_log" >&2
  exit 1
fi

if [[ -n "$newer_than_log" ]]; then
  find "$session_root" -type f -name '*.jsonl' -newer "$newer_than_log" -printf '%T@ %p\n'
else
  find "$session_root" -type f -name '*.jsonl' -printf '%T@ %p\n'
fi \
  | sort -nr \
  | sed 's/^[^ ]* //'
