import json
import shutil
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path


source, output_dir, session_dir = map(Path, sys.argv[1:4])
rule = (
    'Any earlier instruction enabling proactive multi-agent delegation no longer applies. '
    'Do not spawn sub-agents unless the user or applicable AGENTS.md/skill instructions '
    'explicitly ask for sub-agents, delegation, or parallel agent work.'
)
lines = source.read_text(encoding='utf-8').splitlines()
old_id = json.loads(lines[0])['payload']['id']
new_id = str(uuid.uuid4())
lines = [line.replace(old_id, new_id) for line in lines]
last = json.loads(lines[-1])
lines.append(json.dumps({
    'timestamp': datetime.now(timezone.utc).isoformat(),
    'ordinal': last['ordinal'] + 1,
    'type': 'response_item',
    'payload': {
        'type': 'message',
        'id': f'msg_{uuid.uuid4()}',
        'role': 'developer',
        'content': [{'type': 'input_text', 'text': rule}],
    },
}, ensure_ascii=False))
filename = f"rollout-{datetime.now().strftime('%Y-%m-%dT%H-%M-%S')}-{new_id}.jsonl"
output_path = output_dir / filename
output_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
shutil.copy2(output_path, session_dir / filename)
print(json.dumps({'session_id': new_id, 'file': str(output_path), 'lines': len(lines)}))
