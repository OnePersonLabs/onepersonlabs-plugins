#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODEX_BIN="${CODEX_BIN:-codex}"
MARKETPLACE_MANIFEST="$REPO_ROOT/.agents/plugins/marketplace.json"
TRUST_CHECKER="$REPO_ROOT/scripts/check-plugin-hook-trust.py"

fail_install() {
  local message="$1"
  local status="${2:-1}"
  printf 'Install failed: %s\n' "$message" >&2
  exit "$status"
}

run_capture() {
  local destination="$1"
  shift
  local output
  local status

  set +e
  output="$("$@" 2>/dev/null)"
  status=$?
  set -e
  if ((status != 0)); then
    fail_install "command exited with status $status: $*" "$status"
  fi
  printf -v "$destination" '%s' "$output"
}

run_quiet() {
  local ignored_output
  run_capture ignored_output "$@"
}

print_hook_trust_result() {
  local result="$1"
  local status
  status="$(jq -r '.status // "unavailable"' <<<"$result" 2>/dev/null || printf 'unavailable')"

  case "$status" in
    trusted)
      local hook_count
      hook_count="$(jq -r '.hookCount // 0' <<<"$result")"
      printf 'Hook trust check: all %s installed marketplace hooks are trusted.\n' "$hook_count"
      ;;
    review_required)
      printf 'Hook trust review required.\n'
      jq -r '.hooks[]? | "Untrusted hook: \(.key) [\(.trustStatus)]"' <<<"$result"
      jq -r '.missingHooks[]? | "Hook trust could not be verified: \(.)"' <<<"$result"
      printf '%s\n' \
        'Agent instruction: Ask the user to review and trust these hooks in Codex.' \
        'Pause until the user explicitly confirms trust. Do not test or invoke changed hooks before confirmation.'
      ;;
    *)
      local reason
      reason="$(jq -r '.reason // "the Codex hook trust API did not return a usable result"' <<<"$result" 2>/dev/null || printf 'the Codex hook trust API did not return a usable result')"
      printf 'Hook trust check unavailable: %s\n' "$reason"
      printf '%s\n' \
        'Agent instruction: Ask the user to review hook trust in Codex.' \
        'Pause until the user explicitly confirms trust before testing or invoking changed hooks.'
      ;;
  esac
}

command -v "$CODEX_BIN" >/dev/null 2>&1 || fail_install "Codex CLI not found: $CODEX_BIN" 127
command -v jq >/dev/null 2>&1 || fail_install 'jq is required' 127
command -v python3 >/dev/null 2>&1 || fail_install 'python3 is required for the hook trust check' 127
[[ -f "$MARKETPLACE_MANIFEST" ]] || fail_install "marketplace manifest not found: $MARKETPLACE_MANIFEST"
[[ -f "$TRUST_CHECKER" ]] || fail_install "hook trust checker not found: $TRUST_CHECKER"

run_capture MARKETPLACE_NAME jq -er '.name | select(type == "string" and length > 0)' "$MARKETPLACE_MANIFEST"
run_capture PLUGIN_NAME_LINES jq -er '.plugins | map(.name) | select(length > 0) | .[]' "$MARKETPLACE_MANIFEST"
mapfile -t PLUGIN_NAMES <<<"$PLUGIN_NAME_LINES"

run_capture INSTALLED_JSON "$CODEX_BIN" plugin list --json
mapfile -t INSTALLED_PLUGIN_IDS < <(
  jq -r --arg marketplace "$MARKETPLACE_NAME" \
    '.installed[]? | select(.marketplaceName == $marketplace) | .pluginId' \
    <<<"$INSTALLED_JSON"
)
for plugin_id in "${INSTALLED_PLUGIN_IDS[@]}"; do
  run_quiet "$CODEX_BIN" plugin remove "$plugin_id"
done

run_capture MARKETPLACES_JSON "$CODEX_BIN" plugin marketplace list --json
MARKETPLACE_COUNT="$(
  jq -r --arg marketplace "$MARKETPLACE_NAME" \
    '[.marketplaces[]? | select(.name == $marketplace)] | length' \
    <<<"$MARKETPLACES_JSON"
)"
if ((MARKETPLACE_COUNT > 0)); then
  run_quiet "$CODEX_BIN" plugin marketplace remove "$MARKETPLACE_NAME"
fi

run_quiet "$CODEX_BIN" plugin marketplace add "$REPO_ROOT"
for plugin in "${PLUGIN_NAMES[@]}"; do
  run_quiet "$CODEX_BIN" plugin add "$plugin@$MARKETPLACE_NAME"
done

printf 'Install succeeded\n'

set +e
TRUST_RESULT="$(
  python3 "$TRUST_CHECKER" \
    --codex "$CODEX_BIN" \
    --manifest "$MARKETPLACE_MANIFEST" \
    2>/dev/null
)"
TRUST_CHECK_STATUS=$?
set -e
if [[ -z "$TRUST_RESULT" ]]; then
  TRUST_RESULT='{"status":"unavailable","reason":"the hook trust checker returned no result"}'
elif ((TRUST_CHECK_STATUS != 0)) && ! jq -e '.status == "unavailable"' <<<"$TRUST_RESULT" >/dev/null 2>&1; then
  TRUST_RESULT='{"status":"unavailable","reason":"the hook trust checker failed"}'
fi
print_hook_trust_result "$TRUST_RESULT"
