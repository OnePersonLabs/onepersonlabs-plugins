import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const scripts = fileURLToPath(new URL('../../../plugins/opl/skills/refresh-local-plugins/scripts', import.meta.url))

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value))
}

function fixture(t, manifest = '.agents/plugins/marketplace.json') {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "refresh plugin's test-")))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const repo = join(root, 'another marketplace')
  const home = join(root, 'consumer home')
  const log = join(root, 'commands.jsonl')
  const registration = join(root, 'marketplaces.json')
  const selected = join(home, 'plugins', 'cache', 'example-market', 'alpha', '1.0.0')
  const helper = join(selected, 'skills', 'refresh-local-plugins', 'scripts', 'install-local.mjs')
  // Use a copied, installed helper. There are no repository drivers or npm files.
  cpSync(scripts, dirname(helper), { recursive: true })
  const entries = ['alpha', 'beta'].map((name) => ({ name, source: { source: 'local', path: `./components/${name}` } }))
  const marketplacePath = join(repo, manifest)
  writeJson(marketplacePath, { name: 'example-market', plugins: entries })
  for (const { name } of entries) {
    writeJson(join(repo, 'components', name, '.codex-plugin', 'plugin.json'), { name, version: '1.0.0', description: `${name} fixture` })
    writeFileSync(join(repo, 'components', name, 'content.txt'), `${name} new bytes`)
  }
  const sibling = join(home, 'plugins', 'cache', 'unrelated', 'other', '1.0.0', 'content.txt')
  mkdirSync(dirname(sibling), { recursive: true })
  writeFileSync(sibling, 'leave me alone')
  writeJson(registration, [])
  const fakeCodex = join(root, 'codex.mjs')
  writeFileSync(fakeCodex, `
import { appendFileSync, cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import readline from 'node:readline'
const args = process.argv.slice(2)
const env = process.env
const home = env.CODEX_HOME
appendFileSync(env.COMMAND_LOG, JSON.stringify({ args, home, cwd: process.cwd() }) + '\\n')
const out = (value) => process.stdout.write(JSON.stringify(value))
if (args.join(' ') === 'app-server --stdio') {
  readline.createInterface({ input: process.stdin }).on('line', (line) => {
    const message = JSON.parse(line)
    if (message.method === 'initialize') out({ id: message.id, result: {} }), process.stdout.write('\\n')
    else if (message.method === 'hooks/list') out({ id: message.id, result: { data: [{ cwd: process.cwd(), errors: [], warnings: [], hooks: [] }] } }), process.stdout.write('\\n')
    else if (message.method !== 'initialized') process.exit(93)
  })
} else if (JSON.stringify(args) === JSON.stringify(['plugin', 'marketplace', 'list', '--json'])) {
  out({ marketplaces: JSON.parse(readFileSync(env.REGISTRATION, 'utf8')) })
} else if (args.length === 5 && args.slice(0, 3).join(' ') === 'plugin marketplace add' && args[4] === '--json') {
  writeFileSync(env.REGISTRATION, JSON.stringify([{ name: 'example-market', root: args[3] }]))
  out({})
} else if (args.length === 4 && args[0] === 'plugin' && args[1] === 'add' && args[3] === '--json') {
  if (env.ADD_FAILURE) { process.stderr.write('fixture install failed'); process.exit(23) }
  const [name, marketplace] = args[2].split('@')
  if (marketplace !== 'example-market' || !['alpha', 'beta'].includes(name)) process.exit(91)
  const target = join(home, 'plugins', 'cache', marketplace, name, '1.0.0')
  // Mirror cache replacement, including removing the script that launched us.
  if (!target.startsWith(resolve(home) + sep)) process.exit(92)
  if (existsSync(target)) rmSync(target, { recursive: true, force: true })
  cpSync(join(env.MARKETPLACE_ROOT, 'components', name), target, { recursive: true })
  out({ installedPath: env.BAD_RESULT ? join(home, 'missing') : target })
} else { process.stderr.write('unexpected command: ' + JSON.stringify(args)); process.exit(91) }
`)
  const invoke = (args = ['--plugin', 'alpha'], extraEnv = {}, withHome = true) => spawnSync(process.execPath, [
    helper, '--repo', repo, ...args, ...(withHome ? ['--target-home', home] : []),
  ], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, CODEX_BIN: fakeCodex, COMMAND_LOG: log, REGISTRATION: registration, MARKETPLACE_ROOT: repo, ...extraEnv },
  })
  const calls = () => existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse) : []
  return { root, repo, home, log, registration, selected, helper, sibling, entries, marketplacePath, invoke, calls }
}

for (const [manifest, source] of [
  ['.agents/plugins/marketplace.json', { source: 'local', path: './components/alpha' }],
  ['.agents/plugins/api_marketplace.json', { source: 'local', path: './components/alpha' }],
  ['.claude-plugin/marketplace.json', './components/alpha'],
  ['.cursor-plugin/marketplace.json', 'components/alpha'],
]) {
  test(`installed helper refreshes a foreign ${manifest} marketplace and its own cache`, (t) => {
    const f = fixture(t, manifest)
    f.entries[0].source = source
    writeJson(f.marketplacePath, { name: 'example-market', plugins: f.entries })
    const result = f.invoke()
    assert.equal(result.status, 0, result.stderr)
    assert.equal(readFileSync(join(f.selected, 'content.txt'), 'utf8'), 'alpha new bytes')
    assert.equal(existsSync(f.helper), false, 'the running script was replaced successfully')
    assert.equal(readFileSync(f.sibling, 'utf8'), 'leave me alone')
    assert.equal(existsSync(join(f.home, 'plugins', 'cache', 'example-market', 'beta')), false)
    assert.deepEqual(f.calls().map(({ args }) => args), [
      ['plugin', 'marketplace', 'list', '--json'],
      ['plugin', 'marketplace', 'add', f.repo, '--json'],
      ['plugin', 'add', 'alpha@example-market', '--json'],
      ['app-server', '--stdio'],
    ])
    assert.ok(f.calls().every(({ home, cwd }) => home === f.home && cwd === f.repo))
    assert.match(result.stdout, /installed and enabled/u)
  })
}

test('an existing matching registration and repeated plugin selections refresh only those plugins', (t) => {
  const f = fixture(t)
  writeJson(f.registration, [{ name: 'example-market', root: f.repo }])
  const result = f.invoke(['--plugin', 'alpha', '--plugin', 'beta'])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(f.calls().map(({ args }) => args), [
    ['plugin', 'marketplace', 'list', '--json'],
    ['plugin', 'add', 'alpha@example-market', '--json'],
    ['app-server', '--stdio'],
    ['plugin', 'add', 'beta@example-market', '--json'],
    ['app-server', '--stdio'],
  ])
  assert.equal(readFileSync(join(f.home, 'plugins', 'cache', 'example-market', 'beta', '1.0.0', 'content.txt'), 'utf8'), 'beta new bytes')
})

test('explicit all refreshes every marketplace plugin', (t) => {
  const f = fixture(t)
  const result = f.invoke(['--plugin', 'all'])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(f.calls().filter(({ args }) => args[1] === 'add').map(({ args }) => args[2]), ['alpha@example-market', 'beta@example-market'])
})

test('a different checkout registered under the same name stops before any mutation', (t) => {
  const f = fixture(t)
  writeJson(f.registration, [{ name: 'example-market', root: f.root }])
  const result = f.invoke()
  assert.equal(result.status, 1)
  assert.match(result.stderr, /registered at/u)
  assert.deepEqual(f.calls().map(({ args }) => args), [['plugin', 'marketplace', 'list', '--json']])
  assert.equal(existsSync(f.helper), true)
})

test('dry run validates and prints sources without invoking Codex or creating the target home', (t) => {
  const f = fixture(t)
  const absentHome = join(f.root, 'preview only')
  const result = f.invoke(['--plugin', 'alpha', '--target-home', absentHome, '--dry-run'], {}, false)
  assert.equal(result.status, 0, result.stderr)
  const plan = JSON.parse(result.stdout)
  assert.equal(plan.home, absentHome)
  assert.deepEqual(plan.plugins, [{ name: 'alpha', pluginId: 'alpha@example-market', source: join(f.repo, 'components', 'alpha') }])
  assert.deepEqual(f.calls(), [])
  assert.equal(existsSync(absentHome), false)
})

test('the helper runs when reached through a skill directory junction', (t) => {
  const f = fixture(t)
  const alias = join(f.root, 'linked skill scripts')
  symlinkSync(dirname(f.helper), alias, process.platform === 'win32' ? 'junction' : 'dir')
  const result = spawnSync(process.execPath, [join(alias, 'install-local.mjs'), '--help'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Usage: node install-local.mjs/u)
  assert.deepEqual(f.calls(), [])
})

for (const path of ['components/alpha', './components/../components/alpha']) {
  test(`dry run rejects Codex-incompatible local path ${path}`, (t) => {
    const f = fixture(t)
    f.entries[0].source.path = path
    writeJson(f.marketplacePath, { name: 'example-market', plugins: f.entries })
    const result = f.invoke(['--plugin', 'all', '--dry-run'])
    assert.equal(result.status, 1, result.stdout)
    assert.match(result.stderr, /local source path/u)
    assert.deepEqual(f.calls(), [])
  })
}

for (const [label, args, withHome, expected] of [
  ['missing plugin', [], true, /--plugin/u],
  ['missing home', ['--plugin', 'alpha'], false, /--target-home/u],
  ['relative home', ['--plugin', 'alpha', '--target-home', 'relative'], false, /absolute/u],
  ['unknown plugin', ['--plugin', 'missing'], true, /Unknown plugin/u],
  ['all combined with a name', ['--plugin', 'all', '--plugin', 'alpha'], true, /must be used alone/u],
]) {
  test(`${label} stops before any Codex command`, (t) => {
    const f = fixture(t)
    const result = f.invoke(args, {}, withHome)
    assert.equal(result.status, 1)
    assert.match(result.stderr, expected)
    assert.deepEqual(f.calls(), [])
  })
}

test('all preflights every selected source before installing any plugin', (t) => {
  const f = fixture(t)
  f.entries[1].source = { source: 'url', url: 'https://example.com/plugin.git' }
  writeJson(f.marketplacePath, { name: 'example-market', plugins: f.entries })
  const result = f.invoke(['--plugin', 'all'])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /beta: refresh requires a relative local plugin source/u)
  assert.deepEqual(f.calls(), [])
})

test('a source outside the checkout is rejected before Codex runs', (t) => {
  const f = fixture(t)
  f.entries[0].source.path = '..'
  writeJson(f.marketplacePath, { name: 'example-market', plugins: f.entries })
  const result = f.invoke()
  assert.equal(result.status, 1)
  assert.match(result.stderr, /local source path/u)
  assert.deepEqual(f.calls(), [])
})

for (const aliased of [false, true]) {
  test(`a destination inside plugin source is rejected${aliased ? ' through an existing junction parent' : ''}`, (t) => {
    const f = fixture(t)
    const source = join(f.repo, 'components', 'alpha')
    const parent = aliased ? join(f.root, 'source alias') : source
    if (aliased) symlinkSync(source, parent, process.platform === 'win32' ? 'junction' : 'dir')
    const destination = join(parent, 'new home')
    const result = f.invoke(['--plugin', 'alpha', '--target-home', destination], {}, false)
    assert.equal(result.status, 1, result.stdout)
    assert.match(result.stderr, /Codex home.*inside.*plugin source/u)
    assert.deepEqual(f.calls(), [])
    assert.equal(existsSync(destination), false)
  })
}

test('a relocated cache inside plugin source is rejected during preflight', (t) => {
  const f = fixture(t)
  const home = join(f.root, 'relocated-cache-home')
  mkdirSync(join(home, 'plugins'), { recursive: true })
  symlinkSync(join(f.repo, 'components', 'alpha'), join(home, 'plugins', 'cache'), process.platform === 'win32' ? 'junction' : 'dir')
  const result = f.invoke(['--plugin', 'alpha', '--target-home', home, '--dry-run'], {}, false)
  assert.equal(result.status, 1, result.stdout)
  assert.match(result.stderr, /cache.*overlap.*plugin source/u)
  assert.deepEqual(f.calls(), [])
})

test('a failed install reports the failing plugin and stops before later plugins', (t) => {
  const f = fixture(t)
  const result = f.invoke(['--plugin', 'all'], { ADD_FAILURE: '1' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /alpha@example-market.*fixture install failed/u)
  assert.equal(f.calls().filter(({ args }) => args[1] === 'add').length, 1)
  assert.equal(existsSync(f.helper), true)
})

test('an unusable install result is reported as a failure', (t) => {
  const f = fixture(t)
  const result = f.invoke(['--plugin', 'alpha'], { BAD_RESULT: '1' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /usable installedPath/u)
})

test('a plugin declaring hooks must have those hooks discovered and trusted', (t) => {
  const f = fixture(t)
  const source = join(f.repo, 'components', 'alpha')
  const manifestPath = join(source, '.codex-plugin', 'plugin.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  manifest.hooks = './hooks/hooks.json'
  writeJson(manifestPath, manifest)
  writeJson(join(source, 'hooks', 'hooks.json'), { hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'echo ready' }] }] } })
  const result = f.invoke()
  assert.equal(result.status, 1, result.stdout)
  assert.match(result.stderr, /declares hooks but Codex discovered none/u)
})
