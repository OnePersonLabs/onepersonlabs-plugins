#!/usr/bin/env python3
"""Warn when the full Superpowers plugin remains configured."""

from __future__ import annotations

import json
import os
from pathlib import Path
import sys
import tomllib


def load_config(path: Path) -> dict[str, object]:
    if not path.exists():
        return {}
    try:
        with path.open("rb") as config_file:
            return tomllib.load(config_file)
    except (OSError, tomllib.TOMLDecodeError) as error:
        raise RuntimeError(f"cannot parse Codex config {path}: {error}") from error


def configured_superpowers(config: dict[str, object]) -> list[str]:
    plugins = config.get("plugins", {})
    if not isinstance(plugins, dict):
        return []
    return sorted(
        name
        for name in plugins
        if name == "superpowers" or name.startswith("superpowers@")
    )


def main() -> int:
    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    try:
        conflicts = configured_superpowers(load_config(codex_home / "config.toml"))
    except RuntimeError as error:
        print(f"superpowers-conflict-warning-hook: {error}", file=sys.stderr)
        return 1

    if not conflicts:
        return 0

    message = (
        "🚨 DANGER 🚨 FULL SUPERPOWERS IS STILL CONFIGURED: "
        f"{', '.join(conflicts)}. UNINSTALL THE FULL SUPERPOWERS PLUGIN AND "
        "ENABLE ONLY opl-superpowers-lite."
    )
    json.dump(
        {
            "systemMessage": message,
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": message,
            },
        },
        sys.stdout,
        ensure_ascii=False,
    )
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
