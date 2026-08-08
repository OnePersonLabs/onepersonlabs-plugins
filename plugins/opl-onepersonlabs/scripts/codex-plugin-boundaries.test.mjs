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

for (const pluginName of ['opl-onepersonlabs', 'opl-openspec']) {
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

test('OpenSpec contains no general discipline or skill-governance scripts', () => {
  const scripts = readdirSync(join(repositoryRoot, 'plugins', 'opl-openspec', 'scripts'))
  const forbidden = scripts.filter((name) =>
    /discipline|dangerous-shell|skill-judge|skill-reference-sigil/u.test(name),
  )
  assert.deepEqual(forbidden, [])
})

test('OnePersonLabs manifest exports its hooks', () => {
  const manifest = readJson(
    join(repositoryRoot, 'plugins', 'opl-onepersonlabs', '.codex-plugin', 'plugin.json'),
  )
  assert.equal(manifest.name, 'opl-onepersonlabs')
  assert.equal(manifest.hooks, './hooks/hooks.json')
})

test('OpenSpec hook manifest contains only OpenSpec workflow hooks', () => {
  const hooksPath = join(repositoryRoot, 'plugins', 'opl-openspec', 'hooks', 'hooks.json')
  const commands = commandPaths(readJson(hooksPath))
  assert.ok(commands.every((path) => /codex-(openspec|stock-openspec)/u.test(path)))
})
