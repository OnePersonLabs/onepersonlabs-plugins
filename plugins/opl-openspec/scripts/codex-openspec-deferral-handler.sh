#!/bin/bash
set -uo pipefail

INPUT=$(cat)
CONTENT=$(printf '%s\n' "$INPUT" | jq -r '.content // empty' 2>/dev/null || true)
REPO_ROOT=$(printf '%s\n' "$INPUT" | jq -r '.repository_root // empty' 2>/dev/null || true)
PROTOCOL_VERSION=$(printf '%s\n' "$INPUT" | jq -r '.protocol_version // 0' 2>/dev/null || echo 0)

if [[ "$PROTOCOL_VERSION" != "1" || -z "$CONTENT" || -z "$REPO_ROOT" ]]; then
  jq -n '{handled:false}'
  exit 0
fi

FOLLOWUP_INDICATORS='follow-up|follow up|pending |blocked on|deferred to|awaiting |TODO:[[:space:]]*file|should[[:space:]]+file|future work'
declare -a CANDIDATES=()

while IFS= read -r path; do
  [[ -n "$path" ]] && CANDIDATES+=("${path##*/}")
done < <(printf '%s\n' "$CONTENT" | grep -oE 'openspec/changes/[a-z][a-z0-9]*(-[a-z0-9]+)+' 2>/dev/null || true)

if printf '%s\n' "$CONTENT" | grep -qiE "$FOLLOWUP_INDICATORS"; then
  while IFS= read -r token; do
    [[ -n "$token" ]] && CANDIDATES+=("$token")
  done < <(printf '%s\n' "$CONTENT" | grep -oE '[a-z][a-z0-9]+(-[a-z0-9]+){2,}' 2>/dev/null | sort -u || true)
fi

if [[ ${#CANDIDATES[@]} -eq 0 ]]; then
  jq -n '{handled:false}'
  exit 0
fi

for name in "${CANDIDATES[@]}"; do
  [[ "$name" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)+$ ]] || continue
  if [[ -d "$REPO_ROOT/openspec/changes/$name" ]] \
    || compgen -G "$REPO_ROOT/openspec/changes/archive/????-??-??-$name" >/dev/null 2>&1; then
    jq -n '{handled:true, handler:"openspec"}'
    exit 0
  fi
done

jq -n '{handled:false, recognized:true, reason:"OpenSpec deferral handler found no matching active or archived change"}'
