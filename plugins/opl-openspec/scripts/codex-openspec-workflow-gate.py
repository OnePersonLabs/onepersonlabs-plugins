"""Require OpenSpec skill entry or a repair sequence for active artifact edits."""
import json
import os
from pathlib import Path
import re

from codex_openspec_runtime import read_input

SLUG = r"[a-z0-9][a-z0-9-]*"
ARTIFACT = re.compile(rf"openspec/changes/({SLUG})/(?:(?:proposal|design|tasks)\.md|\.openspec\.yaml|specs/{SLUG}(?:/{SLUG})*/spec\.md)")


def commands(record):
    payload = record.get("payload") or {}
    for source in (record.get("tool_input"), payload.get("tool_input")):
        if isinstance(source, dict):
            yield from (source[key] for key in ("command", "cmd") if isinstance(source.get(key), str))
    arguments = payload.get("arguments", record.get("arguments", {}))
    if isinstance(arguments, str):
        try:
            arguments = json.loads(arguments)
        except ValueError:
            arguments = {}
    if isinstance(arguments, dict):
        yield from (arguments[key] for key in ("command", "cmd") if isinstance(arguments.get(key), str))
    source = payload.get("input", record.get("input", ""))
    if isinstance(source, str):
        for encoded in re.findall(r'tools\.exec_command\(\s*\{\s*(?:"cmd"|"command"|cmd|command)\s*:\s*("(?:\\.|[^"\\])*")', source, re.S):
            try:
                yield json.loads(encoded)
            except ValueError:
                pass


def edit_targets(record):
    payload = record.get("payload") or {}
    for source in (record.get("tool_input"), payload.get("tool_input")):
        if isinstance(source, dict) and isinstance(source.get("file_path"), str):
            yield source["file_path"]
    changes = payload.get("changes") or {}
    if isinstance(changes, dict):
        yield from changes
    source = payload.get("input", record.get("input", ""))
    if isinstance(source, str):
        yield from re.findall(r"\*\*\* (?:Update|Add|Delete) File: ([^\n]+)", source)


def decision(payload):
    transcript = payload.get("transcript_path")
    if not transcript or not Path(transcript).is_file():
        return {"continue": True}
    try:
        lines = Path(transcript).read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return {"continue": True}
    records = []
    for line in lines:
        try:
            record = json.loads(line)
            records.append(record if isinstance(record, dict) else {})
        except ValueError:
            records.append({})
    try:
        tail = max(1, int(os.environ.get("OPENSPEC_WORKFLOW_TRANSCRIPT_TAIL_LINES", "1000")))
    except ValueError:
        tail = 1000
    edits = []
    for index in range(max(0, len(records) - tail), len(records)):
        for target in edit_targets(records[index]):
            for match in ARTIFACT.finditer(target.replace("\\", "/")):
                if match.group(1) != "archive":
                    edits.append((index, match.group(1), match.group(0)))
    if not edits:
        return {"continue": True}
    last_edit, change, _ = edits[-1]
    for record in records[:last_edit]:
        item = record.get("payload") or record
        if item.get("name") in ("exec_command", "exec"):
            if any(re.search(r"/skills/openspec-[^/]+/SKILL\.md", command.replace("\\", "/")) for command in commands(record)):
                return {"continue": True}
    after = [command for record in records[last_edit + 1:] for command in commands(record)]
    quoted_change = rf"['\"]?{re.escape(change)}['\"]?(?:\s|$)"
    instructions = any(re.search(rf"openspec\s+instructions\s+.*--change\s+{quoted_change}.*--json", command) for command in after)
    validate = any(re.search(rf"openspec\s+validate(?:\s+\S+)*\s+{quoted_change}.*--strict", command) for command in after)
    if instructions and validate:
        return {"continue": True}
    paths = "\n".join(f"  - {target}" for target in sorted({edit[2] for edit in edits}))
    return {"decision": "block", "reason": f"""OpenSpec artifact edit outside an OpenSpec skill workflow.

This session edited active-change artifact(s):
{paths}

Before stopping, enter the matching OpenSpec skill workflow and follow it.
If this was a same-thread repair of the agent's own malformed artifact, read the relevant
`openspec instructions <artifact-id> --change <name> --json` and run
`openspec validate <name> --strict`.

**DO NOT** use `--no-verify` without user approval.

This gate releases once the transcript shows either the skill workflow entry before the edit,
or the repair validation sequence after it."""}


if __name__ == "__main__":
    _, payload = read_input()
    print(json.dumps(decision(payload)))
