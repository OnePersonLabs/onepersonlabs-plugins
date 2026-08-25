#!/bin/bash
# Durable-deferral provider for repositories that use GitHub Issues.

set -uo pipefail

INPUT=$(cat)
CONTENT=$(printf '%s\n' "$INPUT" | jq -r '.content // empty' 2>/dev/null || true)
REPO_ROOT=$(printf '%s\n' "$INPUT" | jq -r '.repository_root // empty' 2>/dev/null || true)
PROTOCOL_VERSION=$(printf '%s\n' "$INPUT" | jq -r '.protocol_version // 0' 2>/dev/null || echo 0)

if [[ "$PROTOCOL_VERSION" != "1" || -z "$CONTENT" || -z "$REPO_ROOT" ]]; then
  jq -n '{handled:false}'
  exit 0
fi

declare -a ISSUE_REFS=()
while IFS= read -r issue_ref; do
  [[ -n "$issue_ref" ]] && ISSUE_REFS+=("$issue_ref")
done < <(
  {
    printf '%s\n' "$CONTENT" | grep -oE 'https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/issues/[0-9]+' || true
    printf '%s\n' "$CONTENT" | grep -oE '(^|[^[:alnum:]_])#[0-9]+' | grep -oE '#[0-9]+' || true
  } | sort -u
)

if [[ ${#ISSUE_REFS[@]} -eq 0 ]]; then
  jq -n '{handled:false}'
  exit 0
fi

if [[ ! -d "$REPO_ROOT" ]]; then
  jq -n --arg reason "GitHub issue deferral repository root is unavailable: $REPO_ROOT" \
    '{handled:false, recognized:true, reason:$reason}'
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  jq -n '{handled:false, recognized:true, reason:"GitHub issue deferral requires the gh CLI"}'
  exit 0
fi

for issue_ref in "${ISSUE_REFS[@]}"; do
  issue_arg="${issue_ref#\#}"
  issue_json=$(cd "$REPO_ROOT" && gh issue view "$issue_arg" --json number,state,url 2>/dev/null) || {
    jq -n --arg reason "GitHub issue $issue_ref could not be verified" \
      '{handled:false, recognized:true, reason:$reason}'
    exit 0
  }
  state=$(printf '%s\n' "$issue_json" | jq -r '.state // empty' 2>/dev/null || true)
  if [[ "$state" != "OPEN" ]]; then
    if [[ -z "$state" ]]; then
      reason="GitHub issue $issue_ref returned an invalid response"
    else
      reason="GitHub issue $issue_ref is $state and cannot own deferred work"
    fi
    jq -n --arg reason "$reason" '{handled:false, recognized:true, reason:$reason}'
    exit 0
  fi
done

jq -n '{handled:true, handler:"github-issues"}'
