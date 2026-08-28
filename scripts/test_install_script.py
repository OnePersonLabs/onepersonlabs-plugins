#!/usr/bin/env python3
"""Integration tests for the local marketplace installer entrypoint."""

import json
import os
import subprocess
import tempfile
import textwrap
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
INSTALLER = Path(__file__).with_name("install.sh")
MARKETPLACE_MANIFEST = REPO_ROOT / ".agents" / "plugins" / "marketplace.json"


class InstallScriptTests(unittest.TestCase):
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
                    #!/usr/bin/env bash
                    set -euo pipefail

                    case "$*" in
                      "plugin list --json")
                        printf '{"installed":[]}\\n'
                        ;;
                      "plugin marketplace list --json")
                        printf '{"marketplaces":[]}\\n'
                        ;;
                      "plugin marketplace add "*)
                        printf 'marketplace-add=%s\\n' "$4" >>"$FAKE_CODEX_LOG"
                        ;;
                      "plugin add "*)
                        printf 'plugin-add=%s\\n' "$3" >>"$FAKE_CODEX_LOG"
                        ;;
                      *)
                        printf 'unexpected Codex arguments: %s\\n' "$*" >&2
                        exit 64
                        ;;
                    esac
                    """
                ),
                encoding="utf-8",
            )
            fake_codex.chmod(0o755)

            fake_python = fake_bin / "python3"
            fake_python.write_text(
                "#!/usr/bin/env bash\n"
                "printf '{\"status\":\"trusted\",\"hookCount\":0}\\n'\n",
                encoding="utf-8",
            )
            fake_python.chmod(0o755)

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
            self.assertIn(
                "Hook trust check: all 0 installed marketplace hooks are trusted.",
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
