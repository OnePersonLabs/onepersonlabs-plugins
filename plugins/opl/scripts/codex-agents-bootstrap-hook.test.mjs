import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const pluginRoot = resolve(new URL('..', import.meta.url).pathname)
const hookPath = join(pluginRoot, 'scripts', 'codex-agents-bootstrap-hook.sh')
const reference = '@plugins/cache/onepersonlabs-plugins/opl/AGENTS.md'

function withCodexHome(run) {
  const root = mkdtempSync(join(tmpdir(), 'opl-agents-bootstrap-'))
  const codexHome = join(root, '.codex')
  try {
    return run(codexHome)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function runHook(codexHome) {
  return spawnSync('bash', [hookPath], {
    env: { ...process.env, CODEX_HOME: codexHome },
    encoding: 'utf8',
  })
}

test('startup hook creates AGENTS.md and requests a new session', () => {
  withCodexHome((codexHome) => {
    const result = runHook(codexHome)

    assert.equal(result.status, 0, result.stderr)
    assert.equal(readFileSync(join(codexHome, 'AGENTS.md'), 'utf8'), `${reference}\n`)

    const output = JSON.parse(result.stdout)
    assert.match(output.systemMessage, /start a new Codex session/u)
    assert.match(output.systemMessage, /literal AGENTS\.md text/u)
    assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart')
    assert.equal(output.hookSpecificOutput.additionalContext, output.systemMessage)
  })
})

test('startup hook preserves existing instructions when adding the reference', () => {
  withCodexHome((codexHome) => {
    mkdirSync(codexHome, { recursive: true })
    writeFileSync(join(codexHome, 'AGENTS.md'), 'existing instruction')

    const result = runHook(codexHome)

    assert.equal(result.status, 0, result.stderr)
    assert.equal(
      readFileSync(join(codexHome, 'AGENTS.md'), 'utf8'),
      `existing instruction\n${reference}\n`,
    )
    assert.match(JSON.parse(result.stdout).systemMessage, /start a new Codex session/u)
  })
})

test('startup hook is silent and makes no change when the reference exists', () => {
  withCodexHome((codexHome) => {
    mkdirSync(codexHome, { recursive: true })
    const original = `before\n${reference}\nafter\n`
    const agentsPath = join(codexHome, 'AGENTS.md')
    writeFileSync(agentsPath, original)

    const result = runHook(codexHome)

    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout, '')
    assert.equal(readFileSync(agentsPath, 'utf8'), original)
  })
})

test('hook manifest runs the bootstrap only for initial startup', () => {
  const manifest = JSON.parse(
    readFileSync(join(pluginRoot, 'hooks', 'hooks.json'), 'utf8'),
  )
  const startupGroups = manifest.hooks.SessionStart

  assert.equal(startupGroups.length, 1)
  assert.equal(startupGroups[0].matcher, 'startup')
  assert.equal(startupGroups[0].hooks.length, 1)
  assert.match(
    startupGroups[0].hooks[0].command,
    /scripts\/codex-agents-bootstrap-hook\.sh/u,
  )
})
