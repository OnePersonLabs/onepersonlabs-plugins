#!/usr/bin/env python3
"""Reinstall every plugin from this local Codex marketplace checkout."""

from __future__ import annotations

import json
import os
import shlex
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
MARKETPLACE_MANIFEST = REPO_ROOT / ".agents" / "plugins" / "marketplace.json"
TRUST_CHECKER = SCRIPT_DIR / "check-plugin-hook-trust.py"


class InstallError(RuntimeError):
    """An installation failure with the exit status to return."""

    def __init__(self, message: str, status: int = 1) -> None:
        super().__init__(message)
        self.status = status


def run_capture(arguments: list[str]) -> str:
    result = subprocess.run(
        arguments,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if result.returncode != 0:
        raise InstallError(
            f"command exited with status {result.returncode}: {shlex.join(arguments)}",
            result.returncode if result.returncode > 0 else 1,
        )
    return result.stdout.strip()


def parse_command_json(output: str, arguments: list[str]) -> dict[str, Any]:
    try:
        value = json.loads(output)
    except json.JSONDecodeError as error:
        raise InstallError(
            f"command returned invalid JSON: {shlex.join(arguments)}"
        ) from error
    if not isinstance(value, dict):
        raise InstallError(f"command returned non-object JSON: {shlex.join(arguments)}")
    return value


def load_marketplace() -> tuple[str, list[str]]:
    try:
        manifest = json.loads(MARKETPLACE_MANIFEST.read_text(encoding="utf-8"))
        marketplace_name = manifest["name"]
        plugins = manifest["plugins"]
    except (OSError, json.JSONDecodeError, KeyError) as error:
        raise InstallError(f"invalid marketplace manifest: {MARKETPLACE_MANIFEST}") from error

    if not isinstance(marketplace_name, str) or not marketplace_name:
        raise InstallError(f"marketplace name is missing: {MARKETPLACE_MANIFEST}")
    if not isinstance(plugins, list) or not plugins:
        raise InstallError(f"marketplace has no plugins: {MARKETPLACE_MANIFEST}")

    plugin_names: list[str] = []
    for plugin in plugins:
        plugin_name = plugin.get("name") if isinstance(plugin, dict) else None
        if not isinstance(plugin_name, str) or not plugin_name:
            raise InstallError(f"marketplace contains an unnamed plugin: {MARKETPLACE_MANIFEST}")
        plugin_names.append(plugin_name)

    return marketplace_name, plugin_names


def print_hook_trust_result(result: dict[str, Any]) -> None:
    status = result.get("status", "unavailable")
    if status == "trusted":
        hook_count = result.get("hookCount", 0)
        print(f"Hook trust check: all {hook_count} installed marketplace hooks are trusted.")
        return

    if status == "review_required":
        print("Hook trust review required.")
        hooks = result.get("hooks", [])
        if isinstance(hooks, list):
            for hook in hooks:
                if isinstance(hook, dict):
                    print(
                        f"Untrusted hook: {hook.get('key', 'unknown')} "
                        f"[{hook.get('trustStatus', 'unknown')}]"
                    )
        missing_hooks = result.get("missingHooks", [])
        if isinstance(missing_hooks, list):
            for hook_key in missing_hooks:
                print(f"Hook trust could not be verified: {hook_key}")
        print("Agent instruction: Ask the user to review and trust these hooks in Codex.")
        print(
            "Pause until the user explicitly confirms trust. Do not test or invoke "
            "changed hooks before confirmation."
        )
        return

    reason = result.get(
        "reason", "the Codex hook trust API did not return a usable result"
    )
    print(f"Hook trust check unavailable: {reason}")
    print("Agent instruction: Ask the user to review hook trust in Codex.")
    print(
        "Pause until the user explicitly confirms trust before testing or invoking "
        "changed hooks."
    )


def check_hook_trust(codex_bin: str) -> None:
    result = subprocess.run(
        [
            sys.executable,
            str(TRUST_CHECKER),
            "--codex",
            codex_bin,
            "--manifest",
            str(MARKETPLACE_MANIFEST),
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    output = result.stdout.strip()
    if not output:
        trust_result: dict[str, Any] = {
            "status": "unavailable",
            "reason": "the hook trust checker returned no result",
        }
    else:
        try:
            parsed_result = json.loads(output)
        except json.JSONDecodeError:
            parsed_result = None
        if not isinstance(parsed_result, dict):
            trust_result = {
                "status": "unavailable",
                "reason": "the Codex hook trust API did not return a usable result",
            }
        elif result.returncode != 0 and parsed_result.get("status") != "unavailable":
            trust_result = {
                "status": "unavailable",
                "reason": "the hook trust checker failed",
            }
        else:
            trust_result = parsed_result
    print_hook_trust_result(trust_result)


def reinstall(codex_bin: str) -> None:
    marketplace_name, plugin_names = load_marketplace()

    list_plugins = [codex_bin, "plugin", "list", "--json"]
    installed = parse_command_json(run_capture(list_plugins), list_plugins)
    installed_entries = installed.get("installed", [])
    if not isinstance(installed_entries, list):
        raise InstallError("Codex plugin list response has no installed array")
    for plugin in installed_entries:
        if not isinstance(plugin, dict) or plugin.get("marketplaceName") != marketplace_name:
            continue
        plugin_id = plugin.get("pluginId")
        if isinstance(plugin_id, str) and plugin_id:
            run_capture([codex_bin, "plugin", "remove", plugin_id])

    list_marketplaces = [codex_bin, "plugin", "marketplace", "list", "--json"]
    marketplaces = parse_command_json(
        run_capture(list_marketplaces), list_marketplaces
    ).get("marketplaces", [])
    if not isinstance(marketplaces, list):
        raise InstallError("Codex marketplace list response has no marketplaces array")
    if any(
        isinstance(marketplace, dict) and marketplace.get("name") == marketplace_name
        for marketplace in marketplaces
    ):
        run_capture([codex_bin, "plugin", "marketplace", "remove", marketplace_name])

    run_capture([codex_bin, "plugin", "marketplace", "add", str(REPO_ROOT)])
    for plugin_name in plugin_names:
        run_capture([codex_bin, "plugin", "add", f"{plugin_name}@{marketplace_name}"])

    print("Install succeeded")
    check_hook_trust(codex_bin)


def main() -> int:
    requested_codex_bin = os.environ.get("CODEX_BIN", "codex")
    codex_bin = shutil.which(requested_codex_bin)
    if codex_bin is None:
        print(f"Install failed: Codex CLI not found: {requested_codex_bin}", file=sys.stderr)
        return 127
    if not MARKETPLACE_MANIFEST.is_file():
        print(
            f"Install failed: marketplace manifest not found: {MARKETPLACE_MANIFEST}",
            file=sys.stderr,
        )
        return 1
    if not TRUST_CHECKER.is_file():
        print(
            f"Install failed: hook trust checker not found: {TRUST_CHECKER}",
            file=sys.stderr,
        )
        return 1

    try:
        reinstall(codex_bin)
    except InstallError as error:
        print(f"Install failed: {error}", file=sys.stderr)
        return error.status
    return 0


if __name__ == "__main__":
    sys.exit(main())
