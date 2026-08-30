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

const repositoryRoot = resolve(new URL("../../..", import.meta.url).pathname);
const pluginRoot = join(repositoryRoot, "plugins", "opl");
const hookPath = join(pluginRoot, "scripts", "codex-agents-bootstrap-hook.sh");
const currentVersion = "0.1.0+codex.current";

function referenceFor(version) {
  return `@~/.codex/plugins/cache/onepersonlabs-plugins/opl/${version}/AGENTS.md`;
}

function withCodexHome(run) {
  const root = mkdtempSync(join(tmpdir(), "opl-agents-bootstrap-"));
  const codexHome = join(root, ".codex");
  try {
    return run(codexHome);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function installPluginFixture(codexHome, version = currentVersion) {
  const installedRoot = join(
    codexHome,
    "plugins",
    "cache",
    "onepersonlabs-plugins",
    "opl",
    version,
  );
  mkdirSync(installedRoot, { recursive: true });
  writeFileSync(join(installedRoot, "AGENTS.md"), "# OPL instructions\n");
  return installedRoot;
}

function runHook(codexHome, installedRoot = installPluginFixture(codexHome)) {
  return spawnSync("bash", [hookPath], {
    env: {
      ...process.env,
      CODEX_HOME: codexHome,
      PLUGIN_ROOT: installedRoot,
    },
    encoding: "utf8",
  });
}

test("startup hook creates AGENTS.md and requests a new session", () => {
  withCodexHome((codexHome) => {
    const result = runHook(codexHome);
    const reference = referenceFor(currentVersion);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      readFileSync(join(codexHome, "AGENTS.md"), "utf8"),
      `${reference}\n`,
    );

    const output = JSON.parse(result.stdout);
    assert.match(output.systemMessage, /start a new Codex session/u);
    assert.match(output.systemMessage, /literal AGENTS\.md text/u);
    assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
    assert.equal(
      output.hookSpecificOutput.additionalContext,
      output.systemMessage,
    );
  });
});

test("startup hook preserves existing instructions when adding the reference", () => {
  withCodexHome((codexHome) => {
    mkdirSync(codexHome, { recursive: true });
    writeFileSync(join(codexHome, "AGENTS.md"), "existing instruction");
    const reference = referenceFor(currentVersion);

    const result = runHook(codexHome);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      readFileSync(join(codexHome, "AGENTS.md"), "utf8"),
      `existing instruction\n${reference}\n`,
    );
    assert.match(
      JSON.parse(result.stdout).systemMessage,
      /start a new Codex session/u,
    );
  });
});

test("startup hook updates stale OPL references to its installed version", () => {
  withCodexHome((codexHome) => {
    mkdirSync(codexHome, { recursive: true });
    const staleVersioned = referenceFor("0.1.0+codex.previous");
    const staleUnversioned =
      "@~/.codex/plugins/cache/onepersonlabs-plugins/opl/AGENTS.md";
    const staleRepoRelative =
      "@plugins/cache/onepersonlabs-plugins/opl/0.1.0+codex.previous/AGENTS.md";
    const agentsPath = join(codexHome, "AGENTS.md");
    writeFileSync(
      agentsPath,
      `before\n${staleVersioned}\nmiddle\n${staleUnversioned}\n${staleRepoRelative}\nafter\n`,
    );

    const result = runHook(codexHome);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      readFileSync(agentsPath, "utf8"),
      `before\n${referenceFor(currentVersion)}\nmiddle\nafter\n`,
    );
    assert.match(JSON.parse(result.stdout).systemMessage, /OPL updated/u);
  });
});

test("startup hook is silent and makes no change when its versioned reference exists", () => {
  withCodexHome((codexHome) => {
    mkdirSync(codexHome, { recursive: true });
    const reference = referenceFor(currentVersion);
    const original = `before\n${reference}\nafter\n`;
    const agentsPath = join(codexHome, "AGENTS.md");
    writeFileSync(agentsPath, original);

    const result = runHook(codexHome);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
    assert.equal(readFileSync(agentsPath, "utf8"), original);
  });
});

test("hook manifest runs the bootstrap only for initial startup", () => {
  const manifest = JSON.parse(
    readFileSync(join(pluginRoot, "hooks", "hooks.json"), "utf8"),
  );
  const startupGroups = manifest.hooks.SessionStart;
  const bootstrapGroup = startupGroups.find((group) =>
    group.hooks.some((hook) =>
      /scripts\/codex-agents-bootstrap-hook[.]sh/u.test(hook.command),
    ),
  );

  assert.ok(bootstrapGroup);
  assert.equal(bootstrapGroup.matcher, "startup");
  assert.equal(bootstrapGroup.hooks.length, 1);
  assert.match(
    bootstrapGroup.hooks[0].command,
    /scripts\/codex-agents-bootstrap-hook\.sh/u,
  );
});
