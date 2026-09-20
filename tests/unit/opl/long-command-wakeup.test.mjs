import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const runner = fileURLToPath(new URL('../../../plugins/opl/skills/long-command-wakeup/scripts/run_and_wake.py', import.meta.url))
const python = process.env.PYTHON_BIN ?? (process.platform === 'win32' ? 'python' : 'python3')

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function readCompletedStatus(path, timeoutMilliseconds = 10_000) {
  const deadline = Date.now() + timeoutMilliseconds
  let lastError
  while (Date.now() < deadline) {
    try {
      const value = JSON.parse(readFileSync(path, 'utf8'))
      if (['success', 'failed', 'timed_out', 'launch_failed'].includes(value.state) && value.queue?.state !== 'pending') return value
    } catch (error) {
      lastError = error
    }
    await wait(25)
  }
  assert.fail(`result did not reach a completed state: ${lastError?.message ?? path}`)
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'long wake é test-'))
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }))
  const commandLog = join(root, 'codex-calls.jsonl')
  const fakeCodexScript = join(root, 'fake-codex.mjs')
  writeFileSync(fakeCodexScript, `#!/usr/bin/env node
import { appendFileSync } from 'node:fs'
const args = process.argv.slice(2)
if (JSON.stringify(args) === JSON.stringify(['queue', '--help'])) process.exit(0)
if (args[0] !== 'queue') process.exit(91)
appendFileSync(process.env.WAKE_TEST_COMMAND_LOG, JSON.stringify(args) + '\\n')
if (process.env.WAKE_TEST_QUEUE_FAIL === '1') {
  process.stderr.write('fixture queue failure')
  process.exit(19)
}
process.stdout.write('queued fixture message')
`)
  chmodSync(fakeCodexScript, 0o755)
  let fakeCodex = fakeCodexScript
  if (process.platform === 'win32') {
    fakeCodex = join(root, 'fake-codex.cmd')
    writeFileSync(fakeCodex, `@echo off\r\n"${process.execPath}" "%~dp0fake-codex.mjs" %*\r\n`)
  }
  const resultRoot = join(root, 'results with spaces')
  mkdirSync(resultRoot)
  const invoke = (command, { timeoutSeconds = 5, extraEnv = {}, threadArg = true } = {}) => spawnSync(python, [
    runner,
    'start',
    ...(threadArg ? ['--thread', '123e4567-e89b-12d3-a456-426614174000'] : []),
    '--timeout-seconds',
    String(timeoutSeconds),
    '--cwd',
    root,
    '--result-root',
    resultRoot,
    '--',
    ...command,
  ], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      CODEX_BIN: fakeCodex,
      WAKE_TEST_COMMAND_LOG: commandLog,
      ...extraEnv,
    },
  })
  const calls = () => existsSync(commandLog)
    ? readFileSync(commandLog, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse)
    : []
  return { root, resultRoot, commandLog, invoke, calls }
}

test('detached command records output and queues one bounded completion message', async (t) => {
  const f = fixture(t)
  const secretOutput = 'command output must not enter the queue message'
  const result = f.invoke([python, '-c', `import sys; print(${JSON.stringify(secretOutput)}); print('diagnostic', file=sys.stderr)`])
  assert.equal(result.status, 0, result.stderr)
  const receipt = JSON.parse(result.stdout)
  assert.equal(typeof receipt.pid, 'number')
  assert.ok(receipt.resultDir.startsWith(f.resultRoot))

  const status = await readCompletedStatus(join(receipt.resultDir, 'status.json'))
  assert.equal(status.schemaVersion, 1)
  assert.equal(status.state, 'success')
  assert.equal(status.exitCode, 0)
  assert.equal(status.queue.state, 'delivered')
  assert.match(readFileSync(join(receipt.resultDir, 'stdout.log'), 'utf8'), /command output must not enter/u)
  assert.match(readFileSync(join(receipt.resultDir, 'stderr.log'), 'utf8'), /diagnostic/u)
  assert.equal(f.calls().length, 1)
  assert.deepEqual(f.calls()[0].slice(0, 3), ['queue', '--thread', '123e4567-e89b-12d3-a456-426614174000'])
  const message = f.calls()[0][4]
  assert.match(message, /state=success/u)
  assert.match(message, /Inspect the saved artifacts once/u)
  assert.doesNotMatch(message, new RegExp(secretOutput, 'u'))
})

test('nonzero command exit is preserved and still wakes the thread', async (t) => {
  const f = fixture(t)
  const result = f.invoke([python, '-c', 'import sys; sys.exit(7)'])
  assert.equal(result.status, 0, result.stderr)
  const receipt = JSON.parse(result.stdout)
  const status = await readCompletedStatus(join(receipt.resultDir, 'status.json'))
  assert.equal(status.state, 'failed')
  assert.equal(status.exitCode, 7)
  assert.equal(status.queue.state, 'delivered')
  assert.equal(f.calls().length, 1)
})

test('timeout kills the command tree before a descendant can produce later output', async (t) => {
  const f = fixture(t)
  const marker = join(f.root, 'descendant-survived.txt')
  const child = `import time; time.sleep(2); open(${JSON.stringify(marker)}, 'w', encoding='utf-8').write('bad')`
  const parent = `import subprocess, sys, time; subprocess.Popen([sys.executable, '-c', ${JSON.stringify(child)}]); time.sleep(30)`
  const result = f.invoke([python, '-c', parent], { timeoutSeconds: 0.25 })
  assert.equal(result.status, 0, result.stderr)
  const receipt = JSON.parse(result.stdout)
  const status = await readCompletedStatus(join(receipt.resultDir, 'status.json'))
  assert.equal(status.state, 'timed_out')
  assert.equal(status.timedOut, true)
  assert.equal(status.queue.state, 'delivered')
  await wait(2_250)
  assert.equal(existsSync(marker), false)
})

test('launch failure and queue failure remain inspectable without retries', async (t) => {
  const launch = fixture(t)
  const launchResult = launch.invoke([join(launch.root, 'missing executable')])
  assert.equal(launchResult.status, 0, launchResult.stderr)
  const launchReceipt = JSON.parse(launchResult.stdout)
  const launchStatus = await readCompletedStatus(join(launchReceipt.resultDir, 'status.json'))
  assert.equal(launchStatus.state, 'launch_failed')
  assert.equal(launchStatus.queue.state, 'delivered')
  assert.equal(launch.calls().length, 1)

  const queue = fixture(t)
  const queueResult = queue.invoke([python, '-c', 'print("done")'], { extraEnv: { WAKE_TEST_QUEUE_FAIL: '1' } })
  assert.equal(queueResult.status, 0, queueResult.stderr)
  const queueReceipt = JSON.parse(queueResult.stdout)
  const queueStatus = await readCompletedStatus(join(queueReceipt.resultDir, 'status.json'))
  assert.equal(queueStatus.state, 'success')
  assert.equal(queueStatus.queue.state, 'failed')
  assert.equal(queueStatus.queue.exitCode, 19)
  assert.match(readFileSync(join(queueReceipt.resultDir, 'queue.log'), 'utf8'), /fixture queue failure/u)
  assert.equal(queue.calls().length, 1)
})

test('queue capability failure prevents the detached command from starting', (t) => {
  const f = fixture(t)
  const marker = join(f.root, 'should-not-exist.txt')
  const result = f.invoke([python, '-c', `open(${JSON.stringify(marker)}, 'w').write('bad')`], {
    extraEnv: { CODEX_BIN: join(f.root, 'missing-codex') },
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /codex queue is unavailable/iu)
  assert.equal(existsSync(marker), false)
  assert.deepEqual(f.calls(), [])
})

test('thread identity defaults to the Codex-provided environment', async (t) => {
  const f = fixture(t)
  const thread = '0199a751-84f9-7e31-a6bc-0cd0a232c648'
  const result = f.invoke([python, '-c', 'print("done")'], {
    threadArg: false,
    extraEnv: { CODEX_THREAD_ID: thread },
  })
  assert.equal(result.status, 0, result.stderr)
  const receipt = JSON.parse(result.stdout)
  const status = await readCompletedStatus(join(receipt.resultDir, 'status.json'))
  assert.equal(status.state, 'success')
  assert.deepEqual(f.calls()[0].slice(0, 3), ['queue', '--thread', thread])
})
