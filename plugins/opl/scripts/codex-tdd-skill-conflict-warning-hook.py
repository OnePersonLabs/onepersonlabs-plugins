#!/usr/bin/env python3
"""Warn when another test-driven-development skill is enabled."""

from __future__ import annotations

import json
import os
from pathlib import Path
import re
import sys
import tomllib


AGENT_SKILLS_TDD = re.compile(
    r"(?:^|/)plugins/cache/agent-skills/agent-skills/[^/]+/skills/"
    r"test-driven-development/SKILL[.]md$"
)
SUPERPOWERS_TDD = re.compile(
    r"(?:^|/)plugins/cache/(?:openai-curated|openai-curated-remote)/"
    r"superpowers/[^/]+/skills/test-driven-development/SKILL[.]md$"
)


def is_enabled(config: object) -> bool:
    return isinstance(config, dict) and config.get("enabled", True) is not False


def load_config(path: Path) -> dict[str, object]:
    if not path.exists():
        return {}

    try:
        with path.open("rb") as config_file:
            return tomllib.load(config_file)
    except (OSError, tomllib.TOMLDecodeError) as error:
        raise RuntimeError(f"cannot parse Codex config {path}: {error}") from error


def enabled_conflicts(config: dict[str, object]) -> list[str]:
    conflicts: list[str] = []

    plugins = config.get("plugins", {})
    if isinstance(plugins, dict) and any(
        name.startswith("superpowers@") and is_enabled(settings)
        for name, settings in plugins.items()
    ):
        conflicts.append("Superpowers test-driven-development")

    skills = config.get("skills", {})
    skill_entries = skills.get("config", []) if isinstance(skills, dict) else []
    if not isinstance(skill_entries, list):
        skill_entries = []

    agent_skills_enabled = False
    superpowers_enabled = False
    for entry in skill_entries:
        if not is_enabled(entry):
            continue
        path = entry.get("path") if isinstance(entry, dict) else None
        if not isinstance(path, str):
            continue
        normalized_path = path.replace("\\", "/")
        agent_skills_enabled |= AGENT_SKILLS_TDD.search(normalized_path) is not None
        superpowers_enabled |= SUPERPOWERS_TDD.search(normalized_path) is not None

    if agent_skills_enabled:
        conflicts.append("Agent Skills test-driven-development")
    if superpowers_enabled and "Superpowers test-driven-development" not in conflicts:
        conflicts.append("Superpowers test-driven-development")

    return conflicts


def main() -> int:
    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    try:
        conflicts = enabled_conflicts(load_config(codex_home / "config.toml"))
    except RuntimeError as error:
        print(f"codex-tdd-skill-conflict-warning-hook: {error}", file=sys.stderr)
        return 1

    if not conflicts:
        return 0

    message = (
        "🚨 DANGER 🚨 CONFLICTING TDD SKILL(S) ENABLED: "
        f"{', '.join(conflicts)}. DISABLE THEM NOW IN CODEX SETTINGS. "
        "ENABLE AND USE ONLY OPL's $test-driven-development-curated."
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
