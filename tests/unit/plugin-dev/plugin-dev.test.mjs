import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { codexCommand, pythonBin, trustCommand } from '../../../tools/runtime.mjs'

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url))
const driver = join(repositoryRoot, 'tools', 'plugin-dev.mjs')
const sourcePlugin = join(repositoryRoot, 'plugins', 'opl-adhd')
const pluginId = 'opl-adhd@onepersonlabs-plugins'

function withFakeCodex(run) {
  const root = mkdtempSync(join(tmpdir(), "opl plugin-dev's test-"))
  const fakeCodex = join(root, 'codex.mjs')
  const log = join(root, 'codex-commands.jsonl')
  writeFileSync(fakeCodex, `#!/usr/bin/env node
import { appendFileSync } from 'node:fs'
import readline from 'node:readline'
const args = process.argv.slice(2)
appendFileSync(process.env.FAKE_CODEX_LOG, JSON.stringify(args) + '\\n')
if (args[0] === 'exec') {
  process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: process.env.FAKE_AGENT_MESSAGE || 'Using $adhd.' } }) + '\\n')
} else if (args[0] === 'app-server') {
  const lines = readline.createInterface({ input: process.stdin })
  lines.on('line', (line) => {
    const message = JSON.parse(line)
    if (message.id === 1) process.stdout.write(JSON.stringify({ id: 1, result: {} }) + '\\n')
    if (message.id === 2) process.stdout.write(JSON.stringify({ id: 2, result: { data: [{ hooks: [{ pluginId: process.env.FAKE_HOOK_PLUGIN_ID, trustStatus: 'untrusted' }] }] } }) + '\\n')
  })
} else if (args[0] !== 'plugin') process.exit(91)
else if (args[1] === 'list') {
  const installed = process.env.FAKE_INSTALLED_ID
    ? [{ pluginId: process.env.FAKE_INSTALLED_ID, marketplaceName: 'onepersonlabs-plugins' }]
    : []
  process.stdout.write(JSON.stringify({ installed }))
} else if (args[1] === 'marketplace' && args[2] === 'list') {
  process.stdout.write(JSON.stringify({ marketplaces: [{ name: 'onepersonlabs-plugins' }] }))
} else if (args[1] === 'add') {
  process.stdout.write(JSON.stringify({ installedPath: process.env.FAKE_INSTALLED_PATH }))
} else {
  process.stdout.write('{}')
}
`)
  try {
    run({ root, fakeCodex, log })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function commands(path) {
  return readFileSync(path, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line))
}

function fixtureRepository(root) {
  const files = {
    '.agents/plugins/marketplace.json': { name: 'fixture-marketplace', plugins: [{ name: 'fixture', source: { source: 'local', path: './plugins/fixture' }, policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Developer Tools' }] },
    'tools/plugin-matrix.json': { schemaVersion: 1, evaluation: { model: 'fixture-model', reasoningEffort: 'high' }, rootUnitRoots: [], plugins: { fixture: { unitRoots: ['tests/unit/fixture'], commands: [] } } },
    'plugins/fixture/.codex-plugin/plugin.json': { name: 'fixture', version: '1.0.0', description: 'Fixture plugin' },
  }
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(resolve(root, path, '..'), { recursive: true })
    writeFileSync(join(root, path), JSON.stringify(content))
  }
  copyFileSync(driver, join(root, 'tools', 'plugin-dev.mjs'))
  copyFileSync(join(repositoryRoot, 'tools', 'runtime.mjs'), join(root, 'tools', 'runtime.mjs'))
  return join(root, 'tools', 'plugin-dev.mjs')
}

test('install-local installs only the selected plugin and runs no verification layer', () => {
  withFakeCodex(({ root, fakeCodex, log }) => {
    const result = spawnSync(process.execPath, [
      driver,
      'install-local',
      '--plugin',
      'opl-adhd',
      '--target-home',
      join(root, 'consumer'),
    ], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        CODEX_BIN: fakeCodex,
        FAKE_CODEX_LOG: log,
        FAKE_INSTALLED_PATH: sourcePlugin,
      },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Installation only: no tests or skill evaluations were run[.]/u)
    assert.doesNotMatch(result.stdout, /Contract checks|unit checks|clean installed-copy|PASS .*:/u)
    assert.deepEqual(commands(log).map((args) => args.slice(0, 2)), [
      ['plugin', 'list'],
      ['plugin', 'marketplace'],
      ['plugin', 'add'],
    ])
  })
})

test('resume-after-trust verifies the saved installed copy without reinstalling', () => {
  withFakeCodex(({ root, fakeCodex, log }) => {
    const state = join(root, 'state')
    const receiptDirectory = join(state, 'blackbox', 'opl-plugin-dev-receipts')
    mkdirSync(receiptDirectory, { recursive: true })
    writeFileSync(join(receiptDirectory, 'opl-adhd.json'), `${JSON.stringify({
      pluginId,
      installedPath: sourcePlugin,
    })}\n`)

    const result = spawnSync(process.execPath, [
      driver,
      'installed',
      '--plugin',
      'opl-adhd',
      '--resume-after-trust',
    ], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        CODEX_BIN: fakeCodex,
        FAKE_CODEX_LOG: log,
        FAKE_INSTALLED_ID: pluginId,
        OPL_PLUGIN_DEV_STATE: state,
      },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /clean installed-copy checkpoint passed/u)
    assert.deepEqual(commands(log), [['plugin', 'list', '--json']])
  })
})

for (const layout of ['global', 'local']) {
  test(`Codex npm ${layout} shims resolve through PATH and preserve literal arguments`, () => {
    withFakeCodex(({ root }) => {
      const bin = join(root, 'node_modules', '@openai', 'codex', 'bin')
      const shimDirectory = layout === 'global' ? root : join(root, 'node_modules', '.bin')
      mkdirSync(bin, { recursive: true })
      mkdirSync(shimDirectory, { recursive: true })
      writeFileSync(join(shimDirectory, 'codex.cmd'), '@exit /b 91\n')
      writeFileSync(join(bin, 'codex.js'), 'process.stdout.write(JSON.stringify(process.argv.slice(2)))\n')
      const args = ['a path with spaces', 'literal & | < > $() ` " apostrophe\' %PATH%']
      const [executable, ...commandArgs] = codexCommand(args, { platform: 'win32', env: { Path: shimDirectory } })
      const result = spawnSync(executable, commandArgs, { encoding: 'utf8' })
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(JSON.parse(result.stdout), args)
    })
  })
}

test('Python selection follows the native platform and accepts an explicit interpreter', () => {
  assert.equal(pythonBin({}, 'win32'), 'python')
  assert.equal(pythonBin({}, 'linux'), 'python3')
  assert.equal(pythonBin({ PYTHON_BIN: 'custom interpreter' }, 'win32'), 'custom interpreter')
})

test('focus retains the running Node interpreter without depending on PATH', () => {
  withFakeCodex(({ root }) => {
    const file = join(root, 'runtime.test.mjs')
    const marker = join(root, 'runtime-result.txt')
    writeFileSync(file, "import assert from 'node:assert/strict'\nimport { writeFileSync } from 'node:fs'\nassert.equal(process.execPath, process.env.EXPECTED_NODE)\nwriteFileSync(process.env.RUNTIME_RESULT, process.execPath)\n")
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'path' && key !== 'NODE_TEST_CONTEXT'))
    const result = spawnSync(process.execPath, [driver, 'focus', '--file', file], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...env, PATH: '', EXPECTED_NODE: process.execPath, RUNTIME_RESULT: marker },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(readFileSync(marker, 'utf8'), process.execPath)
  })
})

test('unit discovers nested Python tests using native paths in a repository with spaces', () => {
  withFakeCodex(({ root }) => {
    const fixtureDriver = fixtureRepository(root)
    const tests = join(root, 'tests', 'unit', 'fixture', 'nested')
    mkdirSync(tests, { recursive: true })
    writeFileSync(join(tests, 'test_probe.py'), "print('nested Python test executed')\n")
    const result = spawnSync(process.execPath, [fixtureDriver, 'unit', '--plugin', 'fixture'], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /nested Python test executed/u)
  })
})

test('contract validates default and Windows hook targets using either path separator', () => {
  withFakeCodex(({ root }) => {
    const fixtureDriver = fixtureRepository(root)
    const plugin = join(root, 'plugins', 'fixture')
    const manifestPath = join(plugin, '.codex-plugin', 'plugin.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    manifest.hooks = './hooks/hooks.json'
    writeFileSync(manifestPath, JSON.stringify(manifest))
    mkdirSync(join(plugin, 'scripts'))
    mkdirSync(join(plugin, 'hooks'))
    writeFileSync(join(plugin, 'scripts', 'default.py'), '# default hook\n')
    writeFileSync(join(plugin, 'scripts', 'windows.py'), '# Windows hook\n')
    const handler = { type: 'command', command: 'python3 "${PLUGIN_ROOT}/scripts/default.py"', commandWindows: 'python "${PLUGIN_ROOT}\\scripts\\windows.py"' }
    const hookPath = join(plugin, 'hooks', 'hooks.json')
    const writeHooks = () => writeFileSync(hookPath, JSON.stringify({ hooks: { SessionStart: [{ hooks: [handler] }] } }))
    writeHooks()
    const runContract = () => spawnSync(process.execPath, [fixtureDriver, 'contract', '--plugin', 'fixture'], { encoding: 'utf8' })
    const valid = runContract()
    assert.equal(valid.status, 0, valid.stderr)
    handler.commandWindows = 'python "${PLUGIN_ROOT}/scripts/missing.py"'
    writeHooks()
    const invalid = runContract()
    assert.equal(invalid.status, 1)
    assert.match(invalid.stderr, /hook commandWindows target is missing/u)
  })
})

test('eval prepares readable skill links and launches a JS Codex fixture', () => {
  withFakeCodex(({ root, fakeCodex, log }) => {
    const result = spawnSync(process.execPath, [driver, 'eval', '--plugin', 'opl-adhd', '--skill', 'adhd', '--case', 'adhd:direct'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, CODEX_BIN: fakeCodex, FAKE_CODEX_LOG: log, OPL_PLUGIN_DEV_STATE: join(root, 'state') },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /PASS adhd:direct/u)
    const args = commands(log)[0]
    assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only')
    if (process.platform === 'win32') {
      const overrides = args.flatMap((argument, index) => argument === '-c' ? [args[index + 1]] : [])
      assert.ok(overrides.includes('windows.sandbox="elevated"'), 'Windows read-only evaluations must enable their native sandbox backend')
    }
    const host = args[args.indexOf('-C') + 1]
    assert.equal(realpathSync(join(host, '.agents', 'skills', 'adhd')), realpathSync(join(sourcePlugin, 'skills', 'adhd')))
  })
})

for (const [label, response, activated] of [
  ['another skill with a later workflow mention', 'I’m using the **humanizer** skill because the Unslop workflow is about making drafted prose sound direct.', false],
  ['manual-only namespaced invocation', 'I’m using the requested manual-only **`$opl:unslop`** skill.', true],
  ['Markdown around the article and skill', 'I’m applying **the `$unslop` skill** now.', true],
  ['explicitly selected skill', 'I’m using the explicitly selected `unslop` skill to identify its first workflow step.', true],
  ['explicitly requested skill', 'I’m using the explicitly requested `unslop` skill to identify its first workflow step.', true],
  ['another explicitly selected skill with a later target mention', 'I’m using the explicitly selected `humanizer` skill because the unslop workflow is unavailable.', false],
]) {
  test(`eval matches the announced skill target: ${label}`, () => {
    withFakeCodex(({ root, fakeCodex, log }) => {
      const fixtureDriver = fixtureRepository(root)
      const manifestPath = join(root, 'plugins', 'fixture', '.codex-plugin', 'plugin.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      manifest.skills = './skills/'
      writeFileSync(manifestPath, JSON.stringify(manifest))
      const skill = join(root, 'plugins', 'fixture', 'skills', 'unslop')
      mkdirSync(skill, { recursive: true })
      writeFileSync(join(skill, 'SKILL.md'), '---\nname: unslop\ndescription: Correct a workflow mistake.\n---\n')
      const cases = join(root, 'tests', 'evals', 'cases')
      mkdirSync(cases, { recursive: true })
      writeFileSync(join(cases, 'fixture.jsonl'), JSON.stringify({ id: 'unslop:direct', skill: 'unslop', kind: 'direct', prompt: 'Use $unslop.', should_activate: true }) + '\n')
      const result = spawnSync(process.execPath, [fixtureDriver, 'eval', '--plugin', 'fixture', '--skill', 'unslop'], {
        encoding: 'utf8',
        env: { ...process.env, CODEX_BIN: fakeCodex, FAKE_CODEX_LOG: log, FAKE_AGENT_MESSAGE: response, OPL_PLUGIN_DEV_STATE: join(root, 'state') },
      })
      assert.equal(result.status, activated ? 0 : 1, result.stderr)
      const receipt = JSON.parse(readFileSync(join(root, '.work', 'eval-results', 'fixture.json'), 'utf8'))[0]
      assert.equal(receipt.activated, activated)
    })
  })
}

test('installed package discovery launches the Codex app-server without a shell', () => {
  withFakeCodex(({ root, fakeCodex, log }) => {
    const name = 'opl-superpowers-lite'
    const result = spawnSync(process.execPath, [driver, 'installed', '--plugin', name, '--package-only'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        CODEX_BIN: fakeCodex,
        FAKE_CODEX_LOG: log,
        FAKE_INSTALLED_PATH: join(repositoryRoot, 'plugins', name),
        FAKE_HOOK_PLUGIN_ID: `${name}@onepersonlabs-plugins`,
        OPL_PLUGIN_DEV_STATE: join(root, 'state'),
      },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /package\/discovery only/u)
    assert.deepEqual(commands(log).at(-1), ['app-server', '--stdio'])
  })
})

test('trust instructions use quoted PowerShell and POSIX environment assignments', () => {
  const options = { env: { CODEX_BIN: process.execPath } }
  const powershell = trustCommand("C:\\a user's home", 'C:\\repo & work', { ...options, platform: 'win32' })
  assert.match(powershell, /^\$env:CODEX_HOME = 'C:\\a user''s home'; & /u)
  assert.ok(powershell.endsWith("'-C' 'C:\\repo & work'"))
  const posix = trustCommand("/a user's home", '/repo & work', { ...options, platform: 'linux' })
  assert.ok(posix.startsWith("CODEX_HOME='/a user'\\''s home' "))
  assert.ok(posix.endsWith("'-C' '/repo & work'"))
})
