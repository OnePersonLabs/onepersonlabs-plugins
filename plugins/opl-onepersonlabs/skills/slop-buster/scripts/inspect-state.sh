#!/usr/bin/env bash
set -euo pipefail

state_dir="${SLOP_BUSTER_STATE_DIR:-${CODEX_HOME:-$HOME/.codex}/slop-buster}"

printf 'stateDir\t%s\n' "$state_dir"

if [[ ! -d "$state_dir" ]]; then
  printf 'hasFiles\tfalse\n'
  printf 'latestSlopFile\t\n'
  printf 'latestSourceLog\t\n'
  exit 0
fi

if find "$state_dir" -mindepth 1 -maxdepth 1 -print -quit | grep -q .; then
  printf 'hasFiles\ttrue\n'
else
  printf 'hasFiles\tfalse\n'
fi

latest_slop="$(
  find "$state_dir" -maxdepth 1 -type f -name 'slop-*.md' -printf '%T@ %p\n' \
    | sort -nr \
    | sed -n '1s/^[^ ]* //p'
)"

printf 'latestSlopFile\t%s\n' "$latest_slop"

latest_source_log=""
if [[ -n "$latest_slop" ]]; then
  latest_source_log="$(sed -n 's/^SOURCE_LOG: //p' "$latest_slop" | head -1)"
fi

printf 'latestSourceLog\t%s\n' "$latest_source_log"
