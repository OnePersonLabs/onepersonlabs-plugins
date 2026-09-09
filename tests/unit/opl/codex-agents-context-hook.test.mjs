import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pythonBin } from '../../../tools/runtime.mjs'

const pluginRoot = fileURLToPath(new URL('../../../plugins/opl/', import.meta.url))
const hookPath = join(pluginRoot, 'scripts', 'codex-agents-context-hook.py')
const instructions = '# OPL instructions\n\nPreserve café names and 🚀 symbols.\n'

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'OPL context é '))
  const codexHome = join(root, '.codex')
  const installed = join(codexHome, 'plugins', 'cache', 'onepersonlabs-plugins', 'opl', 'test')
  mkdirSync(installed, { recursive: true })
  writeFileSync(join(installed, 'AGENTS.md'), instructions)
  const globalAgents = join(codexHome, 'AGENTS.md')
  const original = '\ufeff# My global instructions\r\nKeep my preferences.\r\n'
  writeFileSync(globalAgents, original)
  try { return run({ root, codexHome, installed, globalAgents, original }) }
  finally { rmSync(root, { recursive: true, force: true }) }
}

function runHook({ codexHome, installed }, event = 'SessionStart', extra = {}) {
  return spawnSync(pythonBin(), ['-B', '-X', 'utf8', hookPath], {
    env: { ...process.env, CODEX_HOME: codexHome, PLUGIN_ROOT: installed },
    input: JSON.stringify({ hook_event_name: event, ...extra }), encoding: 'utf8', windowsHide: true,
  })
}

test('context hook delivers actual instructions and leaves global AGENTS untouched', () => {
  fixture((state) => {
    const result = runHook(state)
    assert.equal(result.status, 0, result.stderr)
    const output = JSON.parse(result.stdout)
    assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart')
    assert.ok(output.hookSpecificOutput.additionalContext.endsWith(instructions))
    assert.ok(output.hookSpecificOutput.additionalContext.includes(join(state.installed, 'AGENTS.md')))
    assert.equal(readFileSync(state.globalAgents, 'utf8'), state.original)
    assert.equal(output.systemMessage, undefined)
  })
})

for (const source of ['startup', 'resume', 'clear', 'compact']) {
  test(`context hook supplies instructions for ${source}`, () => {
    fixture((state) => {
      const result = runHook(state, 'SessionStart', { source })
      assert.equal(result.status, 0, result.stderr)
      assert.ok(JSON.parse(result.stdout).hookSpecificOutput.additionalContext.endsWith(instructions))
    })
  })
}

test('context hook supplies instructions to subagents', () => {
  fixture((state) => {
    const result = runHook(state, 'SubagentStart')
    assert.equal(result.status, 0, result.stderr)
    const output = JSON.parse(result.stdout).hookSpecificOutput
    assert.equal(output.hookEventName, 'SubagentStart')
    assert.ok(output.additionalContext.endsWith(instructions))
  })
})

test('context hook reads updated instructions on every invocation without writing Codex home', () => {
  fixture((state) => {
    const before = runHook(state)
    assert.equal(before.status, 0, before.stderr)
    const updated = '# Revised instructions\n' + 'Keep this policy.\n'.repeat(1500) + 'END_OF_OPL_CONTEXT\n'
    writeFileSync(join(state.installed, 'AGENTS.md'), '\ufeff' + updated)
    const nonexistentHome = join(state.root, 'unused Codex home')
    const after = runHook({ ...state, codexHome: nonexistentHome })
    assert.equal(after.status, 0, after.stderr)
    assert.ok(JSON.parse(after.stdout).hookSpecificOutput.additionalContext.endsWith(updated))
    assert.equal(existsSync(nonexistentHome), false)
    assert.equal(readFileSync(state.globalAgents, 'utf8'), state.original)
  })
})

test('context hook resolves its bundled instructions without PLUGIN_ROOT', () => {
  fixture((state) => {
    mkdirSync(join(state.installed, 'scripts'))
    const copied = join(state.installed, 'scripts', 'codex-agents-context-hook.py')
    copyFileSync(hookPath, copied)
    const env = { ...process.env }
    delete env.PLUGIN_ROOT
    const result = spawnSync(pythonBin(), ['-B', '-X', 'utf8', copied], { env, input: '{}', encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    assert.ok(JSON.parse(result.stdout).hookSpecificOutput.additionalContext.endsWith(instructions))
  })
})

test('context hook fails clearly for missing or empty instructions', () => {
  fixture((state) => {
    const path = join(state.installed, 'AGENTS.md')
    for (const content of [null, ' \n']) {
      if (content === null) rmSync(path)
      else writeFileSync(path, content)
      const result = runHook(state)
      assert.notEqual(result.status, 0)
      assert.equal(result.stdout, '')
      assert.match(result.stderr, /AGENTS.md/u)
    }
  })
})

test('context hook rejects invalid payloads or unsupported event types', () => {
  fixture((state) => {
    assert.notEqual(runHook(state, 'PostToolUse').status, 0)
    const result = spawnSync(pythonBin(), ['-B', '-X', 'utf8', hookPath], {
      env: { ...process.env, PLUGIN_ROOT: state.installed }, input: '{invalid', encoding: 'utf8',
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /hook input/u)
  })
})

test('manifest delivers full context on session lifecycle and subagent start', () => {
  const manifest = JSON.parse(readFileSync(join(pluginRoot, 'hooks', 'hooks.json'), 'utf8'))
  for (const event of ['SessionStart', 'SubagentStart']) {
    const group = manifest.hooks[event].find((group) => group.hooks.some((hook) => hook.command.includes('codex-agents-context-hook.py')))
    assert.ok(group)
    if (event === 'SessionStart') assert.equal(group.matcher, 'startup|resume|clear|compact')
    assert.equal(group.hooks[0].additionalContextLimit, 0)
  }
})

test('Windows manifest delivers full UTF-8 context from a spaced installed path', { skip: process.platform !== 'win32' }, () => {
  fixture((state) => {
    mkdirSync(join(state.installed, 'scripts'))
    copyFileSync(hookPath, join(state.installed, 'scripts', 'codex-agents-context-hook.py'))
    const manifest = JSON.parse(readFileSync(join(pluginRoot, 'hooks', 'hooks.json'), 'utf8'))
    const handler = manifest.hooks.SessionStart.flatMap((group) => group.hooks).find((hook) => hook.command.includes('codex-agents-context-hook.py'))
    const command = handler.commandWindows.replaceAll('${PLUGIN_ROOT}', state.installed)
    const result = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `"${command}"`], {
      input: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup' }),
      env: { ...process.env, CODEX_HOME: state.codexHome, PLUGIN_ROOT: state.installed },
      encoding: 'utf8', windowsHide: true, windowsVerbatimArguments: true,
    })
    assert.equal(result.status, 0, result.stderr)
    assert.ok(JSON.parse(result.stdout).hookSpecificOutput.additionalContext.endsWith(instructions))
    assert.equal(readFileSync(state.globalAgents, 'utf8'), state.original)
  })
})
