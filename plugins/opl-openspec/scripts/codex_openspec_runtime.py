"""Portable, shell-free subprocess helpers shared by the OpenSpec hooks."""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

SCRIPT_DIR = Path(__file__).resolve().parent


def read_input():
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw)
        return raw, payload if isinstance(payload, dict) else {}
    except (ValueError, TypeError):
        return raw, {}


def block(message):
    print(message, file=sys.stderr)
    raise SystemExit(2)


def executable_argv(executable):
    """Resolve Python fixtures and npm shims without interpolating shell text."""
    resolved = shutil.which(executable) or (executable if Path(executable).is_file() else None)
    if not resolved:
        raise FileNotFoundError(executable)
    path = Path(resolved)
    if path.suffix.lower() == ".py":
        return [sys.executable, "-B", "-X", "utf8", str(path)]
    node = os.environ.get("OPENSPEC_NODE_BIN") or shutil.which("node") or "node"
    if path.suffix.lower() in (".js", ".mjs", ".cjs"):
        return [node, str(path)]
    if path.suffix.lower() in (".cmd", ".bat"):
        package_scripts = {
            "pnpm": ("node_modules/pnpm/bin/pnpm.cjs", "node_modules/corepack/dist/pnpm.js", "pnpm.cjs"),
            "codex": ("node_modules/@openai/codex/bin/codex.js",),
        }
        candidates = package_scripts.get(path.stem.lower(), ())
        scripts = [path.parent / candidate for candidate in candidates]
        if path.parent.name.lower() == ".bin":
            scripts.extend(path.parent.parent / candidate.removeprefix("node_modules/")
                           for candidate in candidates if candidate.startswith("node_modules/"))
        for script in scripts:
            if script.is_file():
                return [node, str(script)]
        raise OSError(f"Cannot resolve a native CLI entry point for {path}")
    return [str(path)]


def archive_change(raw, payload):
    tool_input = payload.get("tool_input") or {}
    command = tool_input.get("command") or tool_input.get("cmd") or ""
    if not isinstance(command, str):
        command = ""
    normalized = (command or raw).replace("\\", "/")
    archive_shaped = "openspec/changes/" in normalized and "openspec/changes/archive" in normalized
    if not command:
        if archive_shaped:
            block("BLOCKED: OpenSpec archive hook input could not be decoded; refusing an archive-shaped command.")
        return None
    node = os.environ.get("OPENSPEC_NODE_BIN") or shutil.which("node")
    if not node:
        if archive_shaped:
            block("BLOCKED: OpenSpec archive command parser requires Node.js, but node is unavailable.")
        return None
    try:
        result = subprocess.run([node, str(SCRIPT_DIR / "codex-archive-command.mjs"), command],
                                capture_output=True, text=True, encoding="utf-8", errors="replace")
    except OSError as error:
        block(f"BLOCKED: OpenSpec archive command parsing failed: {error}")
    if result.returncode == 3:
        return None
    change = result.stdout.strip()
    if result.returncode or not re.fullmatch(r"[a-z][a-z0-9-]*", change):
        block("BLOCKED: OpenSpec archive command parsing failed or returned a malformed change name.")
    return change
