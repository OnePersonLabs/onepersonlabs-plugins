"""Require an agent-instructions review after the latest skill edit.

Reviewing releases the stop; another edit re-arms it. Three reviews cap the
loop. Inspect the transcript so edits before compaction remain visible.
"""
import json
from pathlib import Path
import re

from codex_discipline_policy import emit_json, read_input


def records_in(value):
    if isinstance(value, dict):
        yield value
        for key, child in value.items():
            if key in ('arguments', 'input') and isinstance(child, str):
                try:
                    child = json.loads(child)
                except json.JSONDecodeError:
                    pass
            yield from records_in(child)
    elif isinstance(value, list):
        for child in value:
            yield from records_in(child)


def decision(transcript):
    if not transcript or not Path(transcript).is_file():
        return {'continue': True}
    last_edit, last_review, reviews = 0, 0, 0
    paths = set()
    with Path(transcript).open(encoding='utf-8-sig', errors='replace') as stream:
        for number, raw in enumerate(stream, 1):
            try:
                record = json.loads(raw)
            except json.JSONDecodeError:
                continue
            objects = list(records_in(record))
            names = {str(obj.get('name', '')).split('.')[-1] for obj in objects}
            normalized = raw.replace('\\', '/')
            is_edit = bool(names & {'Edit', 'Write', 'MultiEdit', 'NotebookEdit'}) and '/SKILL.md' in normalized
            if 'apply_patch' in names and re.search(r'\*\*\* (?:Add|Update|Delete) File: [^\n]*[/\\]SKILL\.md', raw):
                is_edit = True
            if is_edit:
                last_edit = number
                for obj in objects:
                    path = obj.get('file_path')
                    if isinstance(path, str) and path.replace('\\', '/').endswith('/SKILL.md'):
                        paths.add(path)
            invocation = any(obj.get('skill') == 'agent-instructions' for obj in objects)
            invocation = invocation or bool(re.search(r'command-name>/?agent-instructions<', raw))
            # JSON-escaped Windows separators may normalize to repeated slashes.
            skill_read = 'exec_command' in names and re.search(r'/+skills/+agent-instructions/+SKILL\.md', normalized)
            if invocation or skill_read:
                last_review = number
                reviews += int(bool(invocation)) + int(bool(skill_read))
    if not last_edit or last_review > last_edit or reviews >= 3:
        return {'continue': True}
    skills = '\n'.join('  - ' + path for path in sorted(paths)) or '  (see the SKILL.md edited above)'
    return {'decision': 'block', 'reason': (
        'A skill was created or modified this session but has not yet been evaluated with $agent-instructions:\n'
        f'{skills}\n\nBefore finishing: run $agent-instructions on the modified skill(s).\n'
        'This gate releases once $agent-instructions runs after the latest skill edit.')}


if __name__ == '__main__':
    emit_json(decision(read_input().get('transcript_path')))
