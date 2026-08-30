#!/usr/bin/env python3
"""Read and validate repository-local Lean Delivery policy."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tomllib
from pathlib import Path
from typing import Any


CONFIG_RELATIVE_PATH = Path(".agents") / "lean-delivery.toml"
SUPPORTED_SCHEMA_VERSION = 1

ENUM_SETTINGS = {
    "git.commit": ("auto", "ask", "never"),
    "git.dirty_worktree": (
        "ask-on-conflict",
        "path-only",
        "require-clean",
    ),
    "git.worktree": ("adaptive", "always", "never"),
    "delegation.mode": ("adaptive", "always", "never"),
    "verification.full_gate": (
        "closure-only",
        "pre-review-and-closure",
    ),
}

TABLE_KEYS = {
    "git": {"commit", "dirty_worktree", "worktree"},
    "delegation": {"mode"},
    "review": {"max_repair_cycles"},
    "verification": {"full_gate"},
}

REQUIRED_SETTINGS = (
    "schema_version",
    "git.commit",
    "git.dirty_worktree",
    "git.worktree",
    "delegation.mode",
    "review.max_repair_cycles",
    "verification.full_gate",
)


def empty_settings() -> dict[str, Any]:
    return {
        "schema_version": None,
        "git": {
            "commit": None,
            "dirty_worktree": None,
            "worktree": None,
        },
        "delegation": {"mode": None},
        "review": {"max_repair_cycles": None},
        "verification": {"full_gate": None},
    }


def resolve_repository_root(start: Path) -> Path | None:
    result = subprocess.run(
        ["git", "-C", str(start), "rev-parse", "--show-toplevel"],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    value = result.stdout.strip()
    return Path(value).resolve() if value else None


def nested_value(data: dict[str, Any], dotted: str) -> Any:
    table, key = dotted.split(".", 1)
    value = data.get(table)
    return value.get(key) if isinstance(value, dict) else None


def assign_nested(settings: dict[str, Any], dotted: str, value: Any) -> None:
    table, key = dotted.split(".", 1)
    settings[table][key] = value


def validate_config(data: dict[str, Any]) -> tuple[dict[str, Any], list[str], list[str]]:
    settings = empty_settings()
    missing: list[str] = []
    errors: list[str] = []

    allowed_top_level = {"schema_version", *TABLE_KEYS}
    for key in sorted(set(data) - allowed_top_level):
        errors.append(f"unknown setting: {key}")

    for table, allowed_keys in TABLE_KEYS.items():
        value = data.get(table)
        if value is None:
            continue
        if not isinstance(value, dict):
            errors.append(f"{table} must be a table")
            continue
        for key in sorted(set(value) - allowed_keys):
            errors.append(f"unknown setting: {table}.{key}")

    schema_version = data.get("schema_version")
    if schema_version is None:
        missing.append("schema_version")
    elif isinstance(schema_version, bool) or not isinstance(schema_version, int):
        errors.append("schema_version must be an integer")
    elif schema_version != SUPPORTED_SCHEMA_VERSION:
        errors.append(f"unsupported schema_version: {schema_version}")
    else:
        settings["schema_version"] = schema_version

    for dotted, allowed_values in ENUM_SETTINGS.items():
        value = nested_value(data, dotted)
        if value is None:
            missing.append(dotted)
        elif not isinstance(value, str) or value not in allowed_values:
            choices = ", ".join(allowed_values)
            errors.append(f"{dotted} must be one of: {choices}")
        else:
            assign_nested(settings, dotted, value)

    repair_cycles = nested_value(data, "review.max_repair_cycles")
    if repair_cycles is None:
        missing.append("review.max_repair_cycles")
    elif (
        isinstance(repair_cycles, bool)
        or not isinstance(repair_cycles, int)
        or not 1 <= repair_cycles <= 3
    ):
        errors.append("review.max_repair_cycles must be an integer from 1 through 3")
    else:
        settings["review"]["max_repair_cycles"] = repair_cycles

    ordered_missing = [setting for setting in REQUIRED_SETTINGS if setting in missing]
    return settings, ordered_missing, errors


def payload_for(start: Path) -> tuple[dict[str, Any], int]:
    root = resolve_repository_root(start)
    if root is None:
        return (
            {
                "status": "no-repository",
                "repository_root": None,
                "path": None,
                "settings": empty_settings(),
                "missing": list(REQUIRED_SETTINGS),
                "errors": [],
            },
            0,
        )

    path = root / CONFIG_RELATIVE_PATH
    if not path.is_file():
        return (
            {
                "status": "absent",
                "repository_root": str(root),
                "path": str(path),
                "settings": empty_settings(),
                "missing": list(REQUIRED_SETTINGS),
                "errors": [],
            },
            0,
        )

    try:
        with path.open("rb") as stream:
            data = tomllib.load(stream)
    except (OSError, tomllib.TOMLDecodeError) as error:
        return (
            {
                "status": "invalid",
                "repository_root": str(root),
                "path": str(path),
                "settings": empty_settings(),
                "missing": list(REQUIRED_SETTINGS),
                "errors": [f"invalid TOML: {error}"],
            },
            2,
        )

    settings, missing, errors = validate_config(data)
    status = "invalid" if errors else ("incomplete" if missing else "valid")
    return (
        {
            "status": status,
            "repository_root": str(root),
            "path": str(path),
            "settings": settings,
            "missing": missing,
            "errors": errors,
        },
        2 if errors else 0,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read and validate .agents/lean-delivery.toml from a Git repository."
    )
    parser.add_argument(
        "--repo",
        type=Path,
        default=Path.cwd(),
        help="Repository path or a path inside it (defaults to the current directory).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload, status = payload_for(args.repo)
    json.dump(payload, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return status


if __name__ == "__main__":
    raise SystemExit(main())
