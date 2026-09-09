"""Recognize deferrals backed by existing active or archived OpenSpec changes."""
import json
from pathlib import Path
import re

from codex_openspec_runtime import read_input


def handle(payload):
    content = payload.get("content") or ""
    root = payload.get("repository_root") or ""
    if payload.get("protocol_version") not in (1, "1") or not content or not root:
        return {"handled": False}
    candidates = re.findall(r"openspec/changes/([a-z][a-z0-9]*(?:-[a-z0-9]+)+)", content.replace("\\", "/"))
    if re.search(r"follow-up|follow up|pending |blocked on|deferred to|awaiting |TODO:\s*file|should\s+file|future work", content, re.I):
        candidates.extend(sorted(set(re.findall(r"[a-z][a-z0-9]+(?:-[a-z0-9]+){2,}", content))))
    if not candidates:
        return {"handled": False}
    changes = Path(root) / "openspec" / "changes"
    for name in candidates:
        if (changes / name).is_dir() or any((changes / "archive").glob(f"????-??-??-{name}")):
            return {"handled": True, "handler": "openspec"}
    return {"handled": False, "recognized": True,
            "reason": "OpenSpec deferral handler found no matching active or archived change"}


if __name__ == "__main__":
    _, payload = read_input()
    print(json.dumps(handle(payload)))
