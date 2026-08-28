#!/usr/bin/env python3
"""Integration tests for the local marketplace installer entrypoint."""

import json
import os
import subprocess
import tempfile
import textwrap
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
INSTALLER = Path(__file__).with_name("reinstall-my-plugins.py")
MARKETPLACE_MANIFEST = REPO_ROOT / ".agents" / "plugins" / "marketplace.json"


class ReinstallMyPluginsScriptTests(unittest.TestCase):
    def test_installs_from_the_repository_directory_when_called_elsewhere(self):
        self.assertTrue(INSTALLER.is_file(), f"missing installer: {INSTALLER}")

        manifest = json.loads(MARKETPLACE_MANIFEST.read_text(encoding="utf-8"))
        marketplace_name = manifest["name"]
        expected_plugin_ids = {
            f"{plugin['name']}@{marketplace_name}" for plugin in manifest["plugins"]
        }

        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_root = Path(temporary_directory)
            fake_bin = temporary_root / "bin"
            fake_bin.mkdir()
            codex_log = temporary_root / "codex.log"
            fake_codex = fake_bin / "codex"
            fake_codex.write_text(
                textwrap.dedent(
                    """\
                    #!/usr/bin/env python3
                    import json
                    import os
                    import sys

                    arguments = sys.argv[1:]
                    if arguments == ["plugin", "list", "--json"]:
                        print(json.dumps({"installed": []}))
                    elif arguments == ["plugin", "marketplace", "list", "--json"]:
                        print(json.dumps({"marketplaces": []}))
                    elif arguments[:3] == ["plugin", "marketplace", "add"]:
                        with open(os.environ["FAKE_CODEX_LOG"], "a", encoding="utf-8") as log:
                            print(f"marketplace-add={arguments[3]}", file=log)
                    elif arguments[:2] == ["plugin", "add"]:
                        with open(os.environ["FAKE_CODEX_LOG"], "a", encoding="utf-8") as log:
                            print(f"plugin-add={arguments[2]}", file=log)
                    elif arguments == ["app-server", "--stdio"]:
                        for line in sys.stdin:
                            request = json.loads(line)
                            request_id = request.get("id")
                            if request_id is None:
                                continue
                            result = {"data": []} if request["method"] == "hooks/list" else {}
                            print(json.dumps({"id": request_id, "result": result}), flush=True)
                    else:
                        print(f"unexpected Codex arguments: {' '.join(arguments)}", file=sys.stderr)
                        raise SystemExit(64)
                    """
                ),
                encoding="utf-8",
            )
            fake_codex.chmod(0o755)

            environment = os.environ.copy()
            environment["CODEX_BIN"] = str(fake_codex)
            environment["FAKE_CODEX_LOG"] = str(codex_log)
            environment["PATH"] = f"{fake_bin}:{environment['PATH']}"

            result = subprocess.run(
                [str(INSTALLER)],
                cwd=temporary_root,
                env=environment,
                text=True,
                capture_output=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("Install succeeded", result.stdout)
            self.assertIn("Hook trust review required.", result.stdout)
            self.assertIn(
                "Hook trust could not be verified: opl@onepersonlabs-plugins",
                result.stdout,
            )

            log_lines = codex_log.read_text(encoding="utf-8").splitlines()
            self.assertEqual(
                [line for line in log_lines if line.startswith("marketplace-add=")],
                [f"marketplace-add={REPO_ROOT}"],
            )
            self.assertEqual(
                {
                    line.removeprefix("plugin-add=")
                    for line in log_lines
                    if line.startswith("plugin-add=")
                },
                expected_plugin_ids,
            )


if __name__ == "__main__":
    unittest.main()
