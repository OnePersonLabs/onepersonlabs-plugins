#!/bin/bash
set -uo pipefail

INPUT=$(cat)
CMD=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=codex-archive-command.sh
source "$HOOK_DIR/codex-archive-command.sh"
OPENSPEC_NODE_BIN="$(command -v node 2>/dev/null || true)"
if [[ -z "$OPENSPEC_NODE_BIN" ]]; then
  if [[ "$CMD" == *"openspec/changes/"* && "$CMD" == *"openspec/changes/archive"* ]]; then
    echo "BLOCKED: OpenSpec archive discipline parser requires Node.js." >&2
    exit 2
  fi
  exit 0
fi

CHANGE_NAME=$(openspec_archive_change_from_command "$CMD")
PARSER_EXIT=$?
if [[ $PARSER_EXIT -eq 3 ]]; then exit 0; fi
if [[ $PARSER_EXIT -ne 0 || ! "$CHANGE_NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "BLOCKED: OpenSpec archive discipline command parsing failed." >&2
  exit 2
fi

if [[ -n "${OPL_DISCIPLINE_PLUGIN_ROOT:-}" ]]; then
  OPL_ROOT="$OPL_DISCIPLINE_PLUGIN_ROOT"
else
  PLUGIN_JSON=$("${CODEX_BIN:-codex}" plugin list --json 2>/dev/null || true)
  OPL_ROOT=$(printf '%s\n' "$PLUGIN_JSON" | jq -r '.installed[] | select(.name == "opl" and .installed == true and .enabled == true) | .source.path // empty' 2>/dev/null | head -n 1)
fi
if [[ -z "$OPL_ROOT" || ! -f "$OPL_ROOT/scripts/codex-discipline-policy.sh" ]]; then
  echo "BLOCKED: opl-openspec requires the enabled opl discipline plugin for archive scanning." >&2
  exit 2
fi

OPL_DISCIPLINE_PLUGIN_ROOT="$OPL_ROOT"
# shellcheck source=/dev/null
source "$OPL_ROOT/scripts/codex-discipline-policy.sh"

CHANGE_DIR="$REPO_ROOT/openspec/changes/$CHANGE_NAME"
[[ -d "$CHANGE_DIR" ]] || exit 0
if dir_has_bypass_sentinel "$CHANGE_DIR"; then exit 0; fi

declare -a MVP_HITS=()
declare -a DEFERRAL_HITS=()
declare -a FOLLOWUP_HITS=()
while IFS= read -r MDFILE; do
  scan_md_file_all "$MDFILE" MVP_HITS DEFERRAL_HITS "${MDFILE}:"
done < <(find "$CHANGE_DIR" -type f -name '*.md')

if [[ ${#MVP_HITS[@]} -eq 0 && ${#DEFERRAL_HITS[@]} -eq 0 ]]; then exit 0; fi
emit_block_report "openspec archive" "archiving '$CHANGE_NAME'" MVP_HITS DEFERRAL_HITS FOLLOWUP_HITS
exit 2
