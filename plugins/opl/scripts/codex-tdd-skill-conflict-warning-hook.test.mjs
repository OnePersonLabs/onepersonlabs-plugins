import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const pluginRoot = resolve(new URL("..", import.meta.url).pathname);
const hookPath = join(
  pluginRoot,
  "scripts",
  "codex-tdd-skill-conflict-warning-hook.py",
);

function withCodexHome(config, run) {
  const root = mkdtempSync(join(tmpdir(), "opl-tdd-skill-warning-"));
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

function assertDangerWarning(result, expectedConflict) {
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);

  assert.match(output.systemMessage, /🚨 DANGER/u);
  assert.match(output.systemMessage, expectedConflict);
  assert.match(output.systemMessage, /disable/iu);
  assert.match(
    output.systemMessage,
    /only OPL's \$test-driven-development-curated/iu,
  );
  assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
  assert.equal(
    output.hookSpecificOutput.additionalContext,
    output.systemMessage,
  );
}

test("warns when the Agent Skills TDD skill is enabled", () => {
  const config = `
[[skills.config]]
path = "/tmp/plugins/cache/agent-skills/agent-skills/0.6.7/skills/test-driven-development/SKILL.md"
enabled = true
`;

  withCodexHome(config, (codexHome) => {
    assertDangerWarning(runHook(codexHome), /Agent Skills/u);
  });
});

test("warns when the Superpowers plugin is enabled", () => {
  const config = `
[plugins."superpowers@openai-curated-remote"]
enabled = true
`;

  withCodexHome(config, (codexHome) => {
    assertDangerWarning(runHook(codexHome), /Superpowers/u);
  });
});

test("is silent when both conflicting sources are disabled", () => {
  const config = `
[plugins."superpowers@openai-curated-remote"]
enabled = false

[[skills.config]]
path = "/tmp/plugins/cache/agent-skills/agent-skills/0.6.7/skills/test-driven-development/SKILL.md"
enabled = false
`;

  withCodexHome(config, (codexHome) => {
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

test("hook manifest runs the conflict warning when root sessions start", () => {
  const manifest = JSON.parse(
    readFileSync(join(pluginRoot, "hooks", "hooks.json"), "utf8"),
  );
  const groups = manifest.hooks.SessionStart;
  const warningGroup = groups.find((group) =>
    group.hooks.some((hook) =>
      /scripts\/codex-tdd-skill-conflict-warning-hook\.py/u.test(hook.command),
    ),
  );

  assert.ok(warningGroup);
  assert.equal(warningGroup.matcher, "startup|resume|clear");
});
