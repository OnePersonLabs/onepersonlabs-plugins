#!/usr/bin/env python3
"""Inspect installed Codex plugin hook trust through its app-server API."""

from __future__ import annotations

import argparse
import json
import re
import select
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


INITIALIZE_ID = 1
HOOKS_LIST_ID = 2
SUPPORTED_EVENTS = {
    "Interrupt",
    "PermissionRequest",
    "PostCompact",
    "PostToolUse",
    "PreCompact",
    "PreToolUse",
    "SessionEnd",
    "SessionStart",
    "Stop",
    "SubagentStart",
    "SubagentStop",
    "UserPromptSubmit",
}


def summarize_hooks(
    data: list[dict[str, Any]],
    plugin_ids: set[str],
    expected_hook_keys: set[str],
) -> dict[str, Any]:
    relevant_hooks = [
        hook
        for workspace in data
        for hook in workspace.get("hooks", [])
        if hook.get("pluginId") in plugin_ids
    ]
    seen_keys = {str(hook["key"]) for hook in relevant_hooks if hook.get("key")}
    untrusted_hooks = [
        {
            "pluginId": hook.get("pluginId", "unknown"),
            "key": hook.get("key", "unknown"),
            "trustStatus": hook.get("trustStatus", "unknown"),
            "sourcePath": hook.get("sourcePath", "unknown"),
        }
        for hook in relevant_hooks
        if hook.get("trustStatus") != "trusted"
    ]
    missing_hooks = sorted(expected_hook_keys - seen_keys)

    if untrusted_hooks or missing_hooks:
        return {
            "status": "review_required",
            "hooks": untrusted_hooks,
            "missingHooks": missing_hooks,
        }

    return {"status": "trusted", "hookCount": len(relevant_hooks)}


def event_key(event_name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", event_name).lower()


def load_marketplace(manifest_path: Path) -> tuple[str, set[str], set[str]]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    marketplace_name = str(manifest["name"])
    repo_root = manifest_path.parents[2]
    plugin_ids: set[str] = set()
    expected_hook_keys: set[str] = set()

    for plugin in manifest.get("plugins", []):
        plugin_name = str(plugin["name"])
        plugin_id = f"{plugin_name}@{marketplace_name}"
        plugin_ids.add(plugin_id)

        source = plugin.get("source")
        if not isinstance(source, dict) or not isinstance(source.get("path"), str):
            continue
        plugin_root = (repo_root / source["path"]).resolve()
        plugin_manifest_path = plugin_root / ".codex-plugin" / "plugin.json"
        if not plugin_manifest_path.is_file():
            continue
        plugin_manifest = json.loads(plugin_manifest_path.read_text(encoding="utf-8"))
        hooks_path = plugin_manifest.get("hooks")
        if not isinstance(hooks_path, str) or not hooks_path:
            conventional_hooks_path = plugin_root / "hooks" / "hooks.json"
            if not conventional_hooks_path.is_file():
                continue
            hooks_path = "hooks/hooks.json"
        normalized_hooks_path = hooks_path.removeprefix("./")
        hooks_manifest_path = plugin_root / normalized_hooks_path
        hooks_manifest = json.loads(hooks_manifest_path.read_text(encoding="utf-8"))
        for event_name, groups in hooks_manifest.get("hooks", {}).items():
            if event_name not in SUPPORTED_EVENTS:
                continue
            for group_index, group in enumerate(groups):
                for hook_index, _ in enumerate(group.get("hooks", [])):
                    expected_hook_keys.add(
                        f"{plugin_id}:{normalized_hooks_path}:"
                        f"{event_key(event_name)}:{group_index}:{hook_index}"
                    )

    return marketplace_name, plugin_ids, expected_hook_keys


def send_request(process: subprocess.Popen[str], payload: dict[str, Any]) -> None:
    if process.stdin is None:
        raise RuntimeError("Codex app-server stdin is unavailable")
    process.stdin.write(json.dumps(payload, separators=(",", ":")) + "\n")
    process.stdin.flush()


def read_response(
    process: subprocess.Popen[str], request_id: int, deadline: float
) -> dict[str, Any]:
    if process.stdout is None:
        raise RuntimeError("Codex app-server stdout is unavailable")

    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError(f"Codex app-server timed out waiting for response {request_id}")
        ready, _, _ = select.select([process.stdout], [], [], remaining)
        if not ready:
            raise TimeoutError(f"Codex app-server timed out waiting for response {request_id}")
        line = process.stdout.readline()
        if not line:
            raise RuntimeError(
                f"Codex app-server exited before response {request_id} "
                f"with status {process.poll()}"
            )
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        if payload.get("id") != request_id:
            continue
        if payload.get("error") is not None:
            raise RuntimeError(f"Codex app-server returned an error: {payload['error']}")
        result = payload.get("result")
        if not isinstance(result, dict):
            raise RuntimeError(f"Codex app-server response {request_id} has no result")
        return result


def request_hook_data(codex_bin: str, timeout_seconds: float) -> list[dict[str, Any]]:
    process = subprocess.Popen(
        [codex_bin, "app-server", "--stdio"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        encoding="utf-8",
    )
    deadline = time.monotonic() + timeout_seconds
    try:
        send_request(
            process,
            {
                "method": "initialize",
                "id": INITIALIZE_ID,
                "params": {"clientInfo": {"name": "plugin-installer", "version": "1"}},
            },
        )
        read_response(process, INITIALIZE_ID, deadline)
        send_request(process, {"method": "initialized", "params": {}})
        send_request(process, {"method": "hooks/list", "id": HOOKS_LIST_ID, "params": {}})
        result = read_response(process, HOOKS_LIST_ID, deadline)
        data = result.get("data")
        if not isinstance(data, list):
            raise RuntimeError("Codex hooks/list response has no data array")
        return data
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--codex", required=True)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--timeout", type=float, default=20.0)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        _, plugin_ids, expected_hook_keys = load_marketplace(args.manifest)
        hook_data = request_hook_data(args.codex, args.timeout)
        result = summarize_hooks(hook_data, plugin_ids, expected_hook_keys)
    except (OSError, KeyError, ValueError, RuntimeError, TimeoutError) as error:
        print(json.dumps({"status": "unavailable", "reason": str(error)}))
        return 2

    print(json.dumps(result, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
