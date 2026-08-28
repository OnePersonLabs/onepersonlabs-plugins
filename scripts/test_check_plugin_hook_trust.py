#!/usr/bin/env python3
"""Tests for the installed plugin hook trust checker."""

import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("check-plugin-hook-trust.py")


def load_module():
    spec = importlib.util.spec_from_file_location("check_plugin_hook_trust", MODULE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {MODULE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SummarizeHooksTests(unittest.TestCase):
    def test_reports_all_expected_hooks_as_trusted(self):
        module = load_module()
        result = module.summarize_hooks(
            [{"hooks": [{
                "pluginId": "opl@example",
                "key": "opl@example:hooks/hooks.json:stop:0:0",
                "trustStatus": "trusted",
            }]}],
            {"opl@example"},
            {"opl@example:hooks/hooks.json:stop:0:0"},
        )

        self.assertEqual(result, {"status": "trusted", "hookCount": 1})

    def test_reports_an_untrusted_hook_for_review(self):
        module = load_module()
        result = module.summarize_hooks(
            [{"hooks": [{
                "pluginId": "opl@example",
                "key": "opl@example:hooks/hooks.json:stop:0:0",
                "trustStatus": "modified",
            }]}],
            {"opl@example"},
            {"opl@example:hooks/hooks.json:stop:0:0"},
        )

        self.assertEqual(result["status"], "review_required")
        self.assertEqual(result["hooks"][0]["trustStatus"], "modified")
        self.assertEqual(result["missingHooks"], [])

    def test_treats_a_missing_expected_plugin_as_unverifiable(self):
        module = load_module()
        result = module.summarize_hooks(
            [{"hooks": []}],
            {"opl@example"},
            {"opl@example:hooks/hooks.json:stop:0:0"},
        )

        self.assertEqual(result["status"], "review_required")
        self.assertEqual(result["hooks"], [])
        self.assertEqual(
            result["missingHooks"],
            ["opl@example:hooks/hooks.json:stop:0:0"],
        )


if __name__ == "__main__":
    unittest.main()
