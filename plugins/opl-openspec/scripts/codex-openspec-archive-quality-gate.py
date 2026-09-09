"""Require the workspace validation command before archiving an OpenSpec change."""
import os
from pathlib import Path
import subprocess

from codex_openspec_runtime import archive_change, block, executable_argv, read_input


def main():
    raw, payload = read_input()
    if not archive_change(raw, payload):
        return
    project_dir = Path(os.environ.get("CODEX_PROJECT_DIR") or os.getcwd())
    if not project_dir.is_dir():
        block(f"BLOCKED: OpenSpec archive project root is unavailable: {project_dir}")
    try:
        pnpm = executable_argv(os.environ.get("PNPM_BIN") or "pnpm")
        result = subprocess.run([*pnpm, "run", "validate"], cwd=project_dir,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, encoding="utf-8", errors="replace")
    except OSError as error:
        block(f"BLOCKED: openspec archive gate (quality-gate)\n\nCannot run validation: pnpm is unavailable: {error}")
    if result.returncode:
        tail = "\n".join(f"  {line}" for line in result.stdout.splitlines()[-50:])
        block(f"\nBLOCKED: openspec archive gate (quality-gate)\n\npnpm run validate failed (exit {result.returncode}). Last 50 lines:\n\n{tail}\n")


if __name__ == "__main__":
    main()
