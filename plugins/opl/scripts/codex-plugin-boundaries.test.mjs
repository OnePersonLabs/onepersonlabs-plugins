import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const repositoryRoot = resolve(new URL('../../..', import.meta.url).pathname)

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function commandPaths(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) commandPaths(item, output)
  } else if (value && typeof value === 'object') {
    if (typeof value.command === 'string') {
      const match = value.command.match(/\$\{PLUGIN_ROOT\}\/([^"']+)/u)
      if (match) output.push(match[1])
    }
    for (const child of Object.values(value)) commandPaths(child, output)
  }
  return output
}

for (const pluginName of ['opl', 'opl-openspec']) {
  test(`${pluginName} hook commands resolve inside the plugin`, () => {
    const pluginRoot = join(repositoryRoot, 'plugins', pluginName)
    const hooks = readJson(join(pluginRoot, 'hooks', 'hooks.json'))
    const paths = commandPaths(hooks)
    assert.ok(paths.length > 0)
    for (const path of paths) {
      assert.ok(existsSync(join(pluginRoot, path)), `${pluginName}: ${path}`)
    }
  })
}

test('OpenSpec owns only its domain-specific discipline integrations', () => {
  const scripts = readdirSync(join(repositoryRoot, 'plugins', 'opl-openspec', 'scripts'))
  const forbidden = scripts.filter((name) =>
    /dangerous-shell|skill-judge|skill-reference-sigil/u.test(name),
  )
  assert.deepEqual(forbidden, [])
  assert.ok(scripts.includes('codex-openspec-deferral-handler.sh'))
  assert.ok(scripts.includes('codex-openspec-archive-discipline-gate.sh'))
})

test('OPL owns the repository-independent GitHub Issues deferral provider', () => {
  const scripts = readdirSync(join(repositoryRoot, 'plugins', 'opl', 'scripts'))
  assert.ok(scripts.includes('codex-github-issues-deferral-handler.sh'))
})

test('OnePersonLabs manifest exports its hooks', () => {
  const manifest = readJson(
    join(repositoryRoot, 'plugins', 'opl', '.codex-plugin', 'plugin.json'),
  )
  assert.equal(manifest.name, 'opl')
  assert.equal(manifest.hooks, './hooks/hooks.json')
})

test('OpenSpec hook manifest contains only OpenSpec workflow hooks', () => {
  const hooksPath = join(repositoryRoot, 'plugins', 'opl-openspec', 'hooks', 'hooks.json')
  const commands = commandPaths(readJson(hooksPath))
  assert.ok(commands.every((path) => /codex-(openspec|stock-openspec)/u.test(path)))
  assert.ok(commands.some((path) => /codex-openspec-archive-discipline-gate/u.test(path)))
  assert.ok(commands.some((path) => /codex-openspec-workflow-gate/u.test(path)))
})

test('OPL hook manifest contains no OpenSpec lifecycle hook', () => {
  const hooksPath = join(repositoryRoot, 'plugins', 'opl', 'hooks', 'hooks.json')
  const commands = commandPaths(readJson(hooksPath))
  assert.ok(commands.every((path) => !/openspec|archive-discipline/u.test(path)))
})
