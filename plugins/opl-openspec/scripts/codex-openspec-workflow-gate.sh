#!/bin/bash
# Stop hook: active OpenSpec artifacts must be edited inside an OpenSpec skill
# workflow, or repaired from the CLI's artifact instructions before stopping.

set -uo pipefail

allow_stop() {
  jq -n '{continue:true}'
  exit 0
}

INPUT=$(cat)
TRANSCRIPT=$(printf '%s\n' "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null || true)
OPENSPEC_WORKFLOW_TRANSCRIPT_TAIL_LINES="${OPENSPEC_WORKFLOW_TRANSCRIPT_TAIL_LINES:-1000}"

[[ -z "$TRANSCRIPT" || ! -f "$TRANSCRIPT" ]] && allow_stop

SLUG_RE='[a-z0-9][a-z0-9-]*'
CAPABILITY_RE="${SLUG_RE}(/${SLUG_RE})*"
ARTIFACT_RE="openspec/changes/${SLUG_RE}/(proposal|design|tasks)\\.md|openspec/changes/${SLUG_RE}/specs/${CAPABILITY_RE}/spec\\.md"
SKILL_READ_RE='"name"[[:space:]]*:[[:space:]]*"exec_command".*/skills/(openspec-[^/]+|openspec-x-[^/]+)/SKILL\.md'

extract_edit_targets() {
  local source_file=$1
  local line line_no
  while IFS= read -r line; do
    line_no="${line%%:*}"
    [[ "$line_no" =~ ^[0-9]+$ ]] || continue
    line="${line#*:}"

    printf '%s' "$line" |
      jq -r --argjson line "$line_no" '
        def patch_header_paths:
          ((.payload.input? // .input? // "")
            | scan("\\*\\*\\* (?:Update|Add|Delete) File: ([^\\n]+)")
            | .[0]);

        [
          .tool_input.file_path?,
          .payload.tool_input.file_path?,
          ((.payload.changes? // {}) | keys[]?),
          patch_header_paths
        ]
        | .[]?
        | select(type == "string" and length > 0)
        | "\($line):\(.)"
      ' 2>/dev/null || true
  done < <(awk '{printf "%d:%s\n", NR, $0}' "$source_file" | tail -n "$OPENSPEC_WORKFLOW_TRANSCRIPT_TAIL_LINES")
}

extract_commands() {
  jq -r '
    def decoded_arguments:
      (.payload.arguments? // .arguments? // empty) as $arguments
      | if ($arguments | type) == "string"
        then ($arguments | fromjson? // {})
        else $arguments
        end;

    [
      .tool_input.command?,
      .tool_input.cmd?,
      .payload.tool_input.command?,
      .payload.tool_input.cmd?,
      (decoded_arguments | .command?),
      (decoded_arguments | .cmd?)
    ]
    | .[]?
    | select(type == "string" and length > 0)
  ' 2>/dev/null || true
}

artifact_edit_lines=$(
  extract_edit_targets "$TRANSCRIPT" |
    grep -E "$ARTIFACT_RE" |
    grep -v 'openspec/changes/archive/' || true
)

[[ -z "$artifact_edit_lines" ]] && allow_stop

last_edit=$(printf '%s\n' "$artifact_edit_lines" | tail -n1 | cut -d: -f1)
[[ -z "$last_edit" ]] && allow_stop
last_edit_target=$(printf '%s\n' "$artifact_edit_lines" | tail -n1 | cut -d: -f2-)
last_change=$(
  printf '%s\n' "$last_edit_target" |
    sed -nE "s#.*openspec/changes/(${SLUG_RE})/.*#\\1#p"
)
[[ -z "$last_change" ]] && allow_stop

skill_before=$(
  awk -v n="$last_edit" 'NR < n' "$TRANSCRIPT" |
    grep -nE "$SKILL_READ_RE" |
    tail -n1 || true
)
[[ -n "$skill_before" ]] && allow_stop

post_edit_commands=$(awk -v n="$last_edit" 'NR > n' "$TRANSCRIPT" | extract_commands)
has_repair_instructions=$(
  printf '%s\n' "$post_edit_commands" |
    grep -E "openspec[[:space:]]+instructions[[:space:]].*--change[[:space:]]+['\"]?${last_change}['\"]?([[:space:]]|$).*--json" |
    tail -n1 || true
)
has_strict_validate=$(
  printf '%s\n' "$post_edit_commands" |
    grep -E "openspec[[:space:]]+validate([[:space:]]+[^[:space:]]+)*[[:space:]]+['\"]?${last_change}['\"]?([[:space:]]|$).*--strict" |
    tail -n1 || true
)
if [[ -n "$has_repair_instructions" && -n "$has_strict_validate" ]]; then
  allow_stop
fi

paths=$(
  printf '%s\n' "$artifact_edit_lines" |
    grep -oE "$ARTIFACT_RE" |
    sort -u |
    sed 's/^/  - /'
)
[[ -n "$paths" ]] || paths='  (see active OpenSpec artifact edits above)'

reason="OpenSpec artifact edit outside an OpenSpec skill workflow.

This session edited active-change artifact(s):
${paths}

Before stopping, enter the matching OpenSpec skill workflow and follow it.
If this was a same-thread repair of the agent's own malformed artifact, read the relevant
\`openspec instructions <artifact-id> --change <name> --json\` and run
\`openspec validate <name> --strict\`.

**DO NOT** use \`--no-verify\` without user approval.

This gate releases once the transcript shows either the skill workflow entry before the edit,
or the repair validation sequence after it."

jq -n --arg r "$reason" '{decision:"block", reason:$r}'
