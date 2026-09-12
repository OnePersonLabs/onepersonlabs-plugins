"""Cue $opl:agent-instructions immediately after an instruction-file edit."""
import re

from codex_discipline_policy import emit_json, read_input


PATCH_PATH = re.compile(r'^\*\*\* (?:Add|Update|Delete) File:[ \t]*([^\r\n]+)', re.M)


def instruction_file(path):
    return isinstance(path, str) and path.replace('\\', '/').rsplit('/', 1)[-1].lower() in ('skill.md', 'agents.md')


def edited_paths(tool_name, tool_input):
    name = str(tool_name).split('.')[-1].lower()
    if name in ('edit', 'write'):
        path = tool_input.get('file_path')
        return {path} if instruction_file(path) else set()
    if name in ('applypatch', 'apply_patch'):
        patch = tool_input.get('patch') or tool_input.get('command') or ''
        if isinstance(patch, str):
            return {path.strip() for path in PATCH_PATH.findall(patch) if instruction_file(path.strip())}
    return set()


def decision(hook):
    if hook.get('hook_event_name') != 'PostToolUse':
        return {'continue': True}
    tool_input = hook.get('tool_input')
    if not isinstance(tool_input, dict):
        return {'continue': True}
    response = hook.get('tool_response')
    if isinstance(response, dict) and (response.get('isError') is True or response.get('exit_code') not in (None, 0)):
        return {'continue': True}
    paths = edited_paths(hook.get('tool_name'), tool_input)
    if not paths:
        return {'continue': True}
    names = ', '.join(sorted({path.replace('\\', '/').rsplit('/', 1)[-1] for path in paths}))
    return {'hookSpecificOutput': {
        'hookEventName': 'PostToolUse',
        'additionalContext': f'{names} changed. Use $opl:agent-instructions now to review the edited instruction file.',
    }}


if __name__ == '__main__':
    emit_json(decision(read_input()))
