#!/usr/bin/env bash
# Ensure the global Codex instructions reference the installed OPL instructions.

set -euo pipefail

CODEX_HOME_DIR="${CODEX_HOME:-${HOME}/.codex}"
GLOBAL_AGENTS_FILE="$CODEX_HOME_DIR/AGENTS.md"
LOCK_DIR="$CODEX_HOME_DIR/.opl-agents-bootstrap.lock"
PLUGIN_ROOT_DIR="${PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
OPL_AGENTS_REFERENCE_RE='^@plugins/cache/onepersonlabs-plugins/opl(/[^/]+)?/AGENTS[.]md$'

mkdir -p "$CODEX_HOME_DIR"
CODEX_HOME_DIR="$(cd "$CODEX_HOME_DIR" && pwd -P)"
GLOBAL_AGENTS_FILE="$CODEX_HOME_DIR/AGENTS.md"
LOCK_DIR="$CODEX_HOME_DIR/.opl-agents-bootstrap.lock"
PLUGIN_ROOT_DIR="$(cd "$PLUGIN_ROOT_DIR" && pwd -P)"
PLUGIN_AGENTS_FILE="$PLUGIN_ROOT_DIR/AGENTS.md"

if [[ ! -r "$PLUGIN_AGENTS_FILE" ]]; then
  printf 'codex-agents-bootstrap-hook: cannot read %s\n' "$PLUGIN_AGENTS_FILE" >&2
  exit 1
fi

case "$PLUGIN_AGENTS_FILE" in
  "$CODEX_HOME_DIR"/plugins/cache/onepersonlabs-plugins/opl/*/AGENTS.md)
    OPL_AGENTS_REFERENCE="@${PLUGIN_AGENTS_FILE#"$CODEX_HOME_DIR"/}"
    ;;
  *)
    printf 'codex-agents-bootstrap-hook: plugin AGENTS.md is outside the expected OPL cache: %s\n' "$PLUGIN_AGENTS_FILE" >&2
    exit 1
    ;;
esac

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

opl_reference_count=$(grep -Ec "$OPL_AGENTS_REFERENCE_RE" "$GLOBAL_AGENTS_FILE" || true)
current_reference_count=$(grep -Fxc -- "$OPL_AGENTS_REFERENCE" "$GLOBAL_AGENTS_FILE" || true)

if [[ "$opl_reference_count" -eq 1 && "$current_reference_count" -eq 1 ]]; then
  exit 0
fi

action=added
if [[ "$opl_reference_count" -eq 0 ]]; then
  if [[ -s "$GLOBAL_AGENTS_FILE" ]] && [[ "$(tail -c 1 "$GLOBAL_AGENTS_FILE" | wc -l)" -eq 0 ]]; then
    printf '\n' >>"$GLOBAL_AGENTS_FILE"
  fi
  printf '%s\n' "$OPL_AGENTS_REFERENCE" >>"$GLOBAL_AGENTS_FILE"
else
  action=updated
  temp_file=$(mktemp "$CODEX_HOME_DIR/.AGENTS.md.opl.XXXXXX")
  trap 'rm -f "${temp_file:-}"; rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT
  cp -p "$GLOBAL_AGENTS_FILE" "$temp_file"
  awk -v expected="$OPL_AGENTS_REFERENCE" '
    BEGIN { wrote_reference = 0 }
    /^@plugins\/cache\/onepersonlabs-plugins\/opl(\/[^/]+)?\/AGENTS[.]md$/ {
      if (!wrote_reference) {
        print expected
        wrote_reference = 1
      }
      next
    }
    { print }
  ' "$GLOBAL_AGENTS_FILE" >"$temp_file"
  mv "$temp_file" "$GLOBAL_AGENTS_FILE"
fi

message="OPL ${action} the OPL AGENTS.md reference in ${GLOBAL_AGENTS_FILE} to ${OPL_AGENTS_REFERENCE}. Codex loaded global AGENTS.md before this startup hook ran, so start a new Codex session to load the updated file. Current Codex versions treat this @ path as literal AGENTS.md text rather than expanding it as an include directive."

jq -n --arg message "$message" '{
  systemMessage: $message,
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $message
  }
}'
