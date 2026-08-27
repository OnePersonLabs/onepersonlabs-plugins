#!/bin/bash
# codex-skill-review-gate.sh
#
# Stop hook. When this session created or modified one or more Agent
# Skills (any */SKILL.md file) and no agent-instructions review pass has run
# against the most recent skill edit, block the stop once and tell the
# agent to run $agent-instructions.
#
# WHY a Stop hook and not PostToolUse on Edit|Write: skill authoring is
# many small edits. Nudging after each Write would fire mid-draft and
# judge a half-written skill. The natural moment to evaluate is when the
# agent believes it is done -- i.e. when it tries to stop.
#
# CONVERGENCE: the gate re-arms only when a NEW skill edit lands after
# the last review run (last_edit > last_review), so review -> revise ->
# review is allowed, but a session that stops editing is released at once.
# MAX_REVIEW_RUNS hard-caps the worst case (a model that revises on every
# pass), so this can never trap the agent in an infinite stop loop.
#
# DETECTION is by transcript inspection, not filesystem state, so it is
# correct across compaction and works for skills anywhere (project
# .agents/skills/** and user ~/.agents/skills/**).

set -uo pipefail

MAX_REVIEW_RUNS=3

allow_stop() {
  jq -n '{continue:true}'
  exit 0
}

INPUT=$(cat)
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null || echo "")

# No transcript to inspect -> nothing we can assert; allow stop.
[[ -z "$TRANSCRIPT" || ! -f "$TRANSCRIPT" ]] && allow_stop

# Plain prose mentioning the skill does not count as running it.
REVIEW_RE='"skill"[[:space:]]*:[[:space:]]*"agent-instructions"|command-name>/?agent-instructions<'
REVIEW_SKILL_READ_RE='"name"[[:space:]]*:[[:space:]]*"exec_command".*/skills/agent-instructions/SKILL\.md'
EDIT_RE='"name"[[:space:]]*:[[:space:]]*"(Edit|Write|MultiEdit|NotebookEdit)"'

# Line number of the last edit/write that targeted a */SKILL.md.
last_edit=$(grep -nE "$EDIT_RE" "$TRANSCRIPT" 2>/dev/null \
  | grep -E '/SKILL\.md' | tail -n1 | cut -d: -f1)

# No skill was touched this session -> nothing to do.
[[ -z "$last_edit" ]] && allow_stop

last_review=$(grep -nE "$REVIEW_RE" "$TRANSCRIPT" 2>/dev/null | tail -n1 | cut -d: -f1)
last_review_skill_read=$(grep -nE "$REVIEW_SKILL_READ_RE" "$TRANSCRIPT" 2>/dev/null | tail -n1 | cut -d: -f1)
review_invocation_count=$(grep -cE "$REVIEW_RE" "$TRANSCRIPT" 2>/dev/null || true)
review_invocation_count=${review_invocation_count:-0}
review_count=$(grep -cE "$REVIEW_SKILL_READ_RE" "$TRANSCRIPT" 2>/dev/null || true)
review_count=${review_count:-0}

# Already reviewed the latest edit -> release the stop.
[[ -n "$last_review" && "$last_review" -gt "$last_edit" ]] && allow_stop
[[ -n "$last_review_skill_read" && "$last_review_skill_read" -gt "$last_edit" ]] && allow_stop

# Run cap reached -> stop nagging; let the agent finish.
[[ "$((review_invocation_count + review_count))" -ge "$MAX_REVIEW_RUNS" ]] && allow_stop

# Distinct SKILL.md paths edited this session, for a concrete message.
skills=$(grep -hoE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*/SKILL\.md"' "$TRANSCRIPT" 2>/dev/null \
  | grep -oE '/[^"]*/SKILL\.md' | sort -u | sed 's/^/  - /')
[[ -z "$skills" ]] && skills="  (see the SKILL.md edited above)"

reason="A skill was created or modified this session but has not yet been evaluated with \$agent-instructions:
${skills}

Before finishing: run \$agent-instructions on the modified skill(s).
This gate releases once \$agent-instructions runs after the latest skill edit."

jq -n --arg r "$reason" '{decision:"block", reason:$r}'
exit 0
