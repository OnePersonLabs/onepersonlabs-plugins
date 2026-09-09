import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { pythonBin } from "../../../tools/runtime.mjs";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const pluginRoot = join(repositoryRoot, "plugins", "opl-superpowers-lite");
const hookPath = join(pluginRoot, "scripts", "superpowers-conflict-warning-hook.py");

function withCodexHome(config, run) {
  const root = mkdtempSync(join(tmpdir(), "opl superpowers lite warning "));
  const codexHome = join(root, ".codex");
  mkdirSync(codexHome, { recursive: true });
  writeFileSync(join(codexHome, "config.toml"), config);
  try {
    return run(codexHome);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runHook(codexHome) {
  return spawnSync(pythonBin(), ["-B", "-X", "utf8", hookPath], {
    env: { ...process.env, CODEX_HOME: codexHome },
    encoding: "utf8",
  });
}

for (const enabled of [true, false]) {
  test(`warns when full Superpowers is configured with enabled=${enabled}`, () => {
    const config = `
[plugins."superpowers@openai-curated-remote"]
enabled = ${enabled}
`;
    withCodexHome(config, (codexHome) => {
      const result = runHook(codexHome);
      assert.equal(result.status, 0, result.stderr);
      const output = JSON.parse(result.stdout);
      assert.match(output.systemMessage, /🚨 DANGER/u);
      assert.match(output.systemMessage, /UNINSTALL.*SUPERPOWERS/iu);
      assert.match(output.systemMessage, /ENABLE ONLY.*opl-superpowers-lite/iu);
      assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
      assert.equal(
        output.hookSpecificOutput.additionalContext,
        output.systemMessage,
      );
    });
  });
}

test("is silent when full Superpowers is not configured", () => {
  withCodexHome("", (codexHome) => {
    const result = runHook(codexHome);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  });
});

test("fails clearly when Codex configuration is malformed", () => {
  withCodexHome("[invalid", (codexHome) => {
    const result = runHook(codexHome);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cannot parse Codex config/iu);
  });
});

test("hook manifest warns when root sessions start", () => {
  const hooks = JSON.parse(
    readFileSync(join(pluginRoot, "hooks", "hooks.json"), "utf8"),
  );
  const groups = hooks.hooks.SessionStart;

  assert.equal(groups.length, 1);
  assert.equal(groups[0].matcher, "startup|resume|clear");
  assert.match(
    groups[0].hooks[0].command,
    /scripts\/superpowers-conflict-warning-hook[.]py/u,
  );
});

test("plugin exposes verification-before-completion through its skill manifest", () => {
  const manifest = JSON.parse(
    readFileSync(join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8"),
  );
  assert.equal(manifest.name, "opl-superpowers-lite");
  assert.equal(manifest.skills, "./skills/");

  assert.match(
    readFileSync(
      join(pluginRoot, "skills", "verification-before-completion", "SKILL.md"),
      "utf8",
    ),
    /name: verification-before-completion/u,
  );
});

test("Windows startup manifest preserves the Unicode warning from a spaced path", { skip: process.platform !== "win32" }, () => {
  withCodexHome('[plugins."superpowers@openai-curated-remote"]\nenabled = true\n', (codexHome) => {
    const installed = join(codexHome, "installed plugin");
    mkdirSync(join(installed, "scripts"), { recursive: true });
    copyFileSync(hookPath, join(installed, "scripts", "superpowers-conflict-warning-hook.py"));
    const manifest = JSON.parse(readFileSync(join(pluginRoot, "hooks", "hooks.json"), "utf8"));
    const command = manifest.hooks.SessionStart[0].hooks[0].commandWindows.replaceAll("${PLUGIN_ROOT}", installed);
    const result = spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `"${command}"`], {
      env: { ...process.env, CODEX_HOME: codexHome, PLUGIN_ROOT: installed },
      input: "{}", encoding: "utf8", windowsHide: true, windowsVerbatimArguments: true,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(JSON.parse(result.stdout).systemMessage, /🚨 DANGER/u);
  });
});
