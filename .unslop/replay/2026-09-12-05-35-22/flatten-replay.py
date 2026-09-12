import json
import shutil
import sys
import uuid
from datetime import datetime
from pathlib import Path


base_path, recent_path, output_dir, session_dir, end_offset = sys.argv[1:]
base_bytes = Path(base_path).read_bytes()[: int(end_offset)]
base_lines = base_bytes.decode('utf-8').splitlines()
recent_lines = Path(recent_path).read_text(encoding='utf-8').splitlines()
assert json.loads(base_lines[0])['type'] == 'session_meta'
assert json.loads(recent_lines[0])['type'] == 'session_meta'
assert json.loads(base_lines[-1])['ordinal'] < json.loads(recent_lines[0])['ordinal']

old_id = json.loads(base_lines[0])['payload']['id']
new_id = str(uuid.uuid4())
lines = base_lines + recent_lines[1:]
lines = [line.replace(old_id, new_id) for line in lines]
filename = f"rollout-{datetime.now().strftime('%Y-%m-%dT%H-%M-%S')}-{new_id}.jsonl"
output_path = Path(output_dir) / filename
output_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
shutil.copy2(output_path, Path(session_dir) / filename)
print(json.dumps({'session_id': new_id, 'file': str(output_path), 'lines': len(lines)}))
