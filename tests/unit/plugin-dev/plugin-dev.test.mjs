import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

const repositoryRoot = resolve(new URL('../../..', import.meta.url).pathname)
const driver = join(repositoryRoot, 'tools', 'plugin-dev.mjs')
const sourcePlugin = join(repositoryRoot, 'plugins', 'opl-adhd')
const pluginId = 'opl-adhd@onepersonlabs-plugins'

function withFakeCodex(run) {
  const root = mkdtempSync(join(tmpdir(), 'opl-plugin-dev-test-'))
  const fakeCodex = join(root, 'codex')
  const log = join(root, 'codex-commands.jsonl')
  writeFileSync(fakeCodex, `#!/usr/bin/env node
import { appendFileSync } from 'node:fs'
const args = process.argv.slice(2)
appendFileSync(process.env.FAKE_CODEX_LOG, JSON.stringify(args) + '\\n')
if (args[0] !== 'plugin') process.exit(91)
if (args[1] === 'list') {
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
  chmodSync(fakeCodex, 0o755)
  try {
    run({ root, fakeCodex, log })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function commands(path) {
  return readFileSync(path, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line))
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
