"""Protect CLI-owned OpenSpec skill files from direct Edit and Write calls."""
import re

from codex_openspec_runtime import block, read_input


def main():
    _, payload = read_input()
    target = (payload.get("tool_input") or {}).get("file_path") or ""
    if not isinstance(target, str) or not re.search(r"/\.agents/skills/openspec-", target.replace("\\", "/")):
        return
    block(f"""BLOCK: refusing to edit a stock openspec-* skill.

  {target}

This file belongs to the OpenSpec CLI. Any edit here is silently
clobbered on the next `openspec update`. Stock openspec tooling is
left unmodified by design (see memory: openspec_tooling_tiers).

To change behavior, add or edit an EXTENSION instead:
  - skill -> .agents/skills/openspec-x-<name>/   (openspec-x-<name>)

If you truly intend to modify a stock file, do it deliberately outside
the Edit/Write tools or disable this hook first.""")


if __name__ == "__main__":
    main()
