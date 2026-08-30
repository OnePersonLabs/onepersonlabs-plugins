from __future__ import annotations

import json
import subprocess
import tempfile
import textwrap
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
READER = (
    REPOSITORY_ROOT
    / "plugins"
    / "opl-lean-delivery"
    / "skills"
    / "lean-delivery"
    / "scripts"
    / "read_config.py"
)


VALID_CONFIG = """\
schema_version = 1

[git]
commit = "auto"
dirty_worktree = "ask-on-conflict"
worktree = "adaptive"

[delegation]
mode = "adaptive"

[review]
max_repair_cycles = 1

[verification]
full_gate = "pre-review-and-closure"
"""


def initialize_repository(root: Path) -> None:
    subprocess.run(
        ["git", "init", "--quiet", str(root)],
        check=True,
        capture_output=True,
        text=True,
    )


def write_config(root: Path, content: str) -> None:
    path = root / ".agents" / "lean-delivery.toml"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(content), encoding="utf-8")


def run_reader(
    *, repo: Path | None = None, cwd: Path | None = None
) -> tuple[subprocess.CompletedProcess[str], dict[str, object]]:
    command = ["python3", str(READER)]
    if repo is not None:
        command.extend(["--repo", str(repo)])
    result = subprocess.run(
        command,
        cwd=cwd,
        check=False,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout) if result.stdout else {}
    return result, payload


class ReadConfigTests(unittest.TestCase):
    def test_absent_config_reports_missing_authority_without_error(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            initialize_repository(root)

            result, payload = run_reader(repo=root)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(payload["status"], "absent")
            self.assertEqual(payload["repository_root"], str(root.resolve()))
            self.assertEqual(
                payload["path"], str(root / ".agents" / "lean-delivery.toml")
            )
            self.assertIn("git.commit", payload["missing"])
            self.assertEqual(payload["errors"], [])

    def test_valid_config_returns_all_effective_settings(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            initialize_repository(root)
            write_config(root, VALID_CONFIG)

            result, payload = run_reader(repo=root)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(payload["status"], "valid")
            self.assertEqual(payload["missing"], [])
            self.assertEqual(
                payload["settings"],
                {
                    "delegation": {"mode": "adaptive"},
                    "git": {
                        "commit": "auto",
                        "dirty_worktree": "ask-on-conflict",
                        "worktree": "adaptive",
                    },
                    "review": {"max_repair_cycles": 1},
                    "schema_version": 1,
                    "verification": {
                        "full_gate": "pre-review-and-closure"
                    },
                },
            )

    def test_every_supported_enum_value_is_accepted(self) -> None:
        variants = {
            "git.commit": ["auto", "ask", "never"],
            "git.dirty_worktree": [
                "ask-on-conflict",
                "path-only",
                "require-clean",
            ],
            "git.worktree": ["adaptive", "always", "never"],
            "delegation.mode": ["adaptive", "always", "never"],
            "verification.full_gate": [
                "closure-only",
                "pre-review-and-closure",
            ],
        }
        replacements = {
            "git.commit": 'commit = "auto"',
            "git.dirty_worktree": 'dirty_worktree = "ask-on-conflict"',
            "git.worktree": 'worktree = "adaptive"',
            "delegation.mode": 'mode = "adaptive"',
            "verification.full_gate": 'full_gate = "pre-review-and-closure"',
        }

        for setting, values in variants.items():
            for value in values:
                with self.subTest(setting=setting, value=value):
                    with tempfile.TemporaryDirectory() as directory:
                        root = Path(directory)
                        initialize_repository(root)
                        config = VALID_CONFIG.replace(
                            replacements[setting],
                            f'{replacements[setting].split(" = ")[0]} = "{value}"',
                        )
                        write_config(root, config)

                        result, payload = run_reader(repo=root)

                        self.assertEqual(result.returncode, 0, result.stderr)
                        self.assertEqual(payload["status"], "valid")

    def test_missing_setting_is_reported_as_incomplete(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            initialize_repository(root)
            write_config(root, VALID_CONFIG.replace('commit = "auto"\n', ""))

            result, payload = run_reader(repo=root)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(payload["status"], "incomplete")
            self.assertEqual(payload["missing"], ["git.commit"])
            self.assertIsNone(payload["settings"]["git"]["commit"])

    def test_malformed_toml_is_invalid(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            initialize_repository(root)
            write_config(root, '[git\ncommit = "auto"')

            result, payload = run_reader(repo=root)

            self.assertEqual(result.returncode, 2)
            self.assertEqual(payload["status"], "invalid")
            self.assertRegex(payload["errors"][0], r"invalid TOML")

    def test_unknown_top_level_and_table_keys_are_invalid(self) -> None:
        cases = {
            "top-level": VALID_CONFIG.replace(
                "schema_version = 1",
                "schema_version = 1\nunexpected = true",
            ),
            "table": VALID_CONFIG.replace(
                'commit = "auto"', 'commit = "auto"\nunexpected = true'
            ),
        }

        for name, config in cases.items():
            with self.subTest(name=name):
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    initialize_repository(root)
                    write_config(root, config)

                    result, payload = run_reader(repo=root)

                    self.assertEqual(result.returncode, 2)
                    self.assertEqual(payload["status"], "invalid")
                    self.assertTrue(
                        any("unknown setting" in error for error in payload["errors"])
                    )

    def test_unsupported_schema_version_is_invalid(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            initialize_repository(root)
            write_config(root, VALID_CONFIG.replace("schema_version = 1", "schema_version = 2"))

            result, payload = run_reader(repo=root)

            self.assertEqual(result.returncode, 2)
            self.assertEqual(payload["status"], "invalid")
            self.assertIn("unsupported schema_version: 2", payload["errors"])

    def test_invalid_repair_cycle_limits_are_rejected(self) -> None:
        for value in ["0", "4", "true", '"1"']:
            with self.subTest(value=value):
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    initialize_repository(root)
                    write_config(
                        root,
                        VALID_CONFIG.replace("max_repair_cycles = 1", f"max_repair_cycles = {value}"),
                    )

                    result, payload = run_reader(repo=root)

                    self.assertEqual(result.returncode, 2)
                    self.assertEqual(payload["status"], "invalid")
                    self.assertTrue(
                        any("review.max_repair_cycles" in error for error in payload["errors"])
                    )

    def test_repository_root_is_discovered_from_nested_working_directory(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            nested = root / "packages" / "example"
            nested.mkdir(parents=True)
            initialize_repository(root)
            write_config(root, VALID_CONFIG)

            result, payload = run_reader(cwd=nested)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(payload["status"], "valid")
            self.assertEqual(payload["repository_root"], str(root.resolve()))

    def test_non_git_directory_reports_no_repository(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)

            result, payload = run_reader(repo=root)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(payload["status"], "no-repository")
            self.assertIsNone(payload["repository_root"])
            self.assertIsNone(payload["path"])
            self.assertEqual(payload["errors"], [])


if __name__ == "__main__":
    unittest.main()
