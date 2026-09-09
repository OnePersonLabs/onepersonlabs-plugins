"""Delegate archive artifact discipline to the independently installed OPL plugin."""
import json
import os
from pathlib import Path
import subprocess
import sys

from codex_openspec_runtime import archive_change, block, executable_argv, read_input


def main():
    raw, payload = read_input()
    change = archive_change(raw, payload)
    if not change:
        return
    opl_root = os.environ.get("OPL_DISCIPLINE_PLUGIN_ROOT", "")
    if not opl_root:
        try:
            result = subprocess.run([*executable_argv(os.environ.get("CODEX_BIN") or "codex"),
                                     "plugin", "list", "--json"], capture_output=True,
                                    text=True, encoding="utf-8", errors="replace")
            plugins = json.loads(result.stdout) if result.returncode == 0 else {}
            opl_root = next((plugin.get("source", {}).get("path", "")
                             for plugin in plugins.get("installed", [])
                             if plugin.get("name") == "opl" and plugin.get("installed") is True
                             and plugin.get("enabled") is True), "")
        except (OSError, ValueError, TypeError, AttributeError):
            pass
    policy = Path(opl_root) / "scripts" / "codex_discipline_policy.py"
    if not opl_root or not policy.is_file():
        block("BLOCKED: opl-openspec requires the enabled opl discipline plugin for archive scanning.")
    project_dir = Path(os.environ.get("CODEX_PROJECT_DIR") or os.getcwd())
    change_dir = project_dir / "openspec" / "changes" / change
    environment = dict(os.environ, OPL_DISCIPLINE_PLUGIN_ROOT=str(opl_root))
    try:
        result = subprocess.run([sys.executable, "-B", "-X", "utf8", str(policy), "archive", str(change_dir)],
                                input=raw, text=True, encoding="utf-8", env=environment)
    except OSError as error:
        block(f"BLOCKED: OpenSpec archive discipline policy could not run: {error}")
    if result.returncode:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
