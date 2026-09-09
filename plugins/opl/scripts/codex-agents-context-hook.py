#!/usr/bin/env python3
"""Deliver bundled OPL instructions as model context without editing global files."""

import json
import os
from pathlib import Path
import sys


def main():
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError as error:
        raise ValueError(f"invalid hook input: {error}") from None
    if not isinstance(payload, dict):
        raise ValueError("hook input must be a JSON object")
    event = payload.get("hook_event_name", "SessionStart")
    if event not in ("SessionStart", "SubagentStart"):
        raise ValueError(f"unsupported hook event: {event}")

    root = Path(os.environ.get("PLUGIN_ROOT") or Path(__file__).resolve().parent.parent).resolve()
    agents = root / "AGENTS.md"
    instructions = agents.read_text(encoding="utf-8-sig")
    if not instructions.strip():
        raise ValueError(f"OPL instructions are empty: {agents}")

    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": event,
            "additionalContext": f"OPL instructions from {agents}:\n\n{instructions}",
        },
    }))


if __name__ == "__main__":
    try:
        main()
    except (OSError, UnicodeError, ValueError) as error:
        print(f"codex-agents-context-hook: {error}", file=sys.stderr)
        sys.exit(1)
