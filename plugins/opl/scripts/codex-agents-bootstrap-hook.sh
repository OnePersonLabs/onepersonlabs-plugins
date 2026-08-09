#!/usr/bin/env bash
# Ensure the global Codex instructions reference the installed OPL instructions.

set -euo pipefail

OPL_AGENTS_REFERENCE='@plugins/cache/onepersonlabs-plugins/opl/AGENTS.md'
CODEX_HOME_DIR="${CODEX_HOME:-${HOME}/.codex}"
GLOBAL_AGENTS_FILE="$CODEX_HOME_DIR/AGENTS.md"
LOCK_DIR="$CODEX_HOME_DIR/.opl-agents-bootstrap.lock"

mkdir -p "$CODEX_HOME_DIR"

lock_acquired=0
for _ in {1..100}; do
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    lock_acquired=1
    break
  fi
  sleep 0.05
done

if [[ "$lock_acquired" -ne 1 ]]; then
  printf 'codex-agents-bootstrap-hook: could not lock %s\n' "$GLOBAL_AGENTS_FILE" >&2
  exit 1
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

touch "$GLOBAL_AGENTS_FILE"

if grep -Fxq -- "$OPL_AGENTS_REFERENCE" "$GLOBAL_AGENTS_FILE"; then
  exit 0
fi

if [[ -s "$GLOBAL_AGENTS_FILE" ]] && [[ "$(tail -c 1 "$GLOBAL_AGENTS_FILE" | wc -l)" -eq 0 ]]; then
  printf '\n' >>"$GLOBAL_AGENTS_FILE"
fi
printf '%s\n' "$OPL_AGENTS_REFERENCE" >>"$GLOBAL_AGENTS_FILE"

message="OPL added ${OPL_AGENTS_REFERENCE} to ${GLOBAL_AGENTS_FILE}. Codex loaded global AGENTS.md before this startup hook ran, so start a new Codex session to load the updated file. Current Codex versions treat this @ path as literal AGENTS.md text rather than expanding it as an include directive."

jq -n --arg message "$message" '{
  systemMessage: $message,
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $message
  }
}'
