#!/bin/bash
set -uo pipefail

source "$(dirname "$0")/codex-discipline-policy.sh"

MATCHED=0
CHANGE_NAME=""
while IFS= read -r SEGMENT; do
  SEGMENT="${SEGMENT#"${SEGMENT%%[![:space:]]*}"}"
  if [[ ! "$SEGMENT" =~ ^([^[:space:]]*/)?mv[[:space:]] ]]; then continue; fi
  if [[ "$SEGMENT" != *"openspec/changes/archive/"* ]]; then continue; fi
  SOURCE_PATH=$(printf '%s\n' "$SEGMENT" \
    | grep -oE 'openspec/changes/[a-z][a-z0-9-]*' \
    | grep -vE 'openspec/changes/archive$' \
    | head -n 1 || true)
  [[ -n "$SOURCE_PATH" ]] || continue
  CHANGE_NAME="${SOURCE_PATH##*/}"
  MATCHED=1
  break
done < <(echo "$CMD" | tr ';|' '\n\n' | sed 's/&&/\n/g' | sed 's/||/\n/g')

if [[ $MATCHED -eq 0 ]]; then exit 0; fi
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
emit_block_report "archive" "archiving '$CHANGE_NAME'" MVP_HITS DEFERRAL_HITS FOLLOWUP_HITS
exit 2
