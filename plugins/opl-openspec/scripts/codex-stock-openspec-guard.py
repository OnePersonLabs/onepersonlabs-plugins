"""Protect CLI-owned OpenSpec skills while leaving local extensions editable."""
import re

from codex_openspec_runtime import block, read_input


def main():
    _, payload = read_input()
    tool_input = payload.get("tool_input") or {}
    targets = []
    if isinstance(tool_input, dict):
        targets.append(tool_input.get("file_path", ""))
        patch = tool_input.get("input") or tool_input.get("patch") or ""
    else:
        patch = tool_input if isinstance(tool_input, str) else ""
    if isinstance(patch, str):
        targets.extend(re.findall(r"^\*\*\* (?:Update|Add|Delete|Move to) File: (.+)$", patch, re.M))
        targets.extend(re.findall(r"^\*\*\* Move to: (.+)$", patch, re.M))
    target = next((target for target in targets if isinstance(target, str) and
                   re.search(r"(?:^|/)\.(?:agents|codex)/skills/openspec-(?!x-)[^/]+(?:/|$)",
                             target.replace("\\", "/"))), None)
    if target is None:
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
