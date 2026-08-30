import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(new URL("../../..", import.meta.url).pathname);
const pluginRoot = join(repositoryRoot, "plugins", "opl-superpowers-lite");
const hookPath = join(pluginRoot, "scripts", "superpowers-conflict-warning-hook.py");

function withCodexHome(config, run) {
  const root = mkdtempSync(join(tmpdir(), "opl-superpowers-lite-warning-"));
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
  return spawnSync("python3", [hookPath], {
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

test("plugin exposes exactly the two intended skills", () => {
  const manifest = JSON.parse(
    readFileSync(join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8"),
  );
  assert.equal(manifest.name, "opl-superpowers-lite");
  assert.equal(manifest.skills, "./skills/");

  const expectedSkills = ["systematic-debugging", "verification-before-completion"];
  const actualSkills = readdirSync(join(pluginRoot, "skills"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(actualSkills, expectedSkills);

  for (const skill of expectedSkills) {
    assert.match(
      readFileSync(join(pluginRoot, "skills", skill, "SKILL.md"), "utf8"),
      new RegExp(`name: ${skill}`, "u"),
    );
  }
});
