import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { pythonBin } from '../../../tools/runtime.mjs'
import { archiveChangeFromCommand } from '../../../plugins/opl-openspec/scripts/codex-archive-command.mjs'

const scripts = fileURLToPath(new URL('../../../plugins/opl-openspec/scripts/', import.meta.url))
const command = 'Move-Item -LiteralPath "openspec\\changes\\current-change" -Destination "openspec\\changes\\archive\\2026-09-09-current-change"'

function runHook(name, payload, env = {}) {
  return spawnSync(pythonBin(), ['-B', '-X', 'utf8', join(scripts, `${name}.py`)], {
    input: JSON.stringify(payload), encoding: 'utf8', windowsHide: true,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', OPENSPEC_NODE_BIN: process.execPath, ...env },
  })
}

for (const [label, text] of [
  ['PowerShell named paths', command],
  ['PowerShell reordered parameters', "Move-Item -Destination 'C:\\project space\\openspec\\changes\\archive\\2026-09-09-current-change' -Force -LiteralPath 'C:\\project space\\openspec\\changes\\current-change'"],
  ['PowerShell positional paths', "Move-Item '.\\openspec\\changes\\current-change\\' '.\\openspec\\changes\\archive\\2026-09-09-current-change'"],
  ['PowerShell native git', "git.exe mv 'C:\\project space\\openspec\\changes\\current-change' 'C:\\project space\\openspec\\changes\\archive\\2026-09-09-current-change'"],
  ['rtk wrapper', `rtk proxy ${command}`],
  ['native PowerShell wrapper', `rtk proxy powershell -NoProfile -Command '${command}'`],
  ['native pwsh wrapper', `pwsh.exe -NoProfile -Command '${command}'`],
  ['case insensitive PowerShell executable', `PowerShell.exe -NoProfile -Command '${command}'`],
  ['native mv alias', 'mv openspec\\changes\\current-change openspec\\changes\\archive\\2026-09-09-current-change'],
  ['native mi alias', 'mi openspec/changes/current-change openspec/changes/archive/2026-09-09-current-change'],
  ['native move alias', 'move openspec/changes/current-change openspec/changes/archive/2026-09-09-current-change'],
  ['native uppercase MV alias', 'MV openspec/changes/current-change openspec/changes/archive/2026-09-09-current-change'],
  ['Unix mv', 'mv -- "openspec/changes/current-change" "openspec/changes/archive/2026-09-09-current-change"'],
  ['Unix git mv', 'git mv -f openspec/changes/current-change openspec/changes/archive/2026-09-09-current-change'],
  ['quoted shell operator', 'echo "first; second"; command mv "openspec/changes/current-change" "openspec/changes/archive/2026-09-09-current-change"'],
]) {
  test(`archive parser recognizes ${label}`, () => assert.equal(archiveChangeFromCommand(text), 'current-change'))
}

test('archive parser ignores text that only describes a move', () => {
  assert.equal(archiveChangeFromCommand(`Write-Output '${command}'`), null)
  assert.equal(archiveChangeFromCommand(`powershell -Command 'Write-Output "Move-Item openspec/changes/current-change openspec/changes/archive/2026-09-09-current-change"'`), null)
  assert.equal(archiveChangeFromCommand('Move-Item openspec/changes/current-change backup/current-change'), null)
})

test('quality hook invokes native validation in the project directory and surfaces its failure', () => {
  const project = mkdtempSync(join(tmpdir(), 'openspec native $ quality '))
  try {
    const fixture = join(project, 'pnpm fixture.py')
    const receipt = join(project, 'receipt.json')
    writeFileSync(fixture, 'import json, os, pathlib, sys\npathlib.Path("receipt.json").write_text(json.dumps({"args": sys.argv[1:], "cwd": os.getcwd()}))\nprint("native validation failure")\nsys.exit(7)\n')
    const result = runHook('codex-openspec-archive-quality-gate', { tool_input: { cmd: `rtk proxy powershell -NoProfile -Command '${command}'` } }, { CODEX_PROJECT_DIR: project, PNPM_BIN: fixture })
    assert.equal(result.status, 2, result.stderr)
    assert.match(result.stderr, /pnpm run validate failed \(exit 7\)/u)
    assert.match(result.stderr, /native validation failure/u)
    assert.deepEqual(JSON.parse(readFileSync(receipt, 'utf8')), { args: ['run', 'validate'], cwd: project })
  } finally { rmSync(project, { recursive: true, force: true }) }
})

test('quality hook succeeds with a native validation executable', () => {
  const project = mkdtempSync(join(tmpdir(), 'openspec-native-quality-'))
  try {
    const fixture = join(project, 'pnpm.py')
    writeFileSync(fixture, 'print("validated")\n')
    const result = runHook('codex-openspec-archive-quality-gate', { tool_input: { command } }, { CODEX_PROJECT_DIR: project, PNPM_BIN: fixture })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout, '')
  } finally { rmSync(project, { recursive: true, force: true }) }
})

test('quality hook does not require pnpm for unrelated commands', () => {
  const result = runHook('codex-openspec-archive-quality-gate', { tool_input: { cmd: 'Get-Content README.md' } }, { PNPM_BIN: 'does-not-exist-pnpm' })
  assert.equal(result.status, 0, result.stderr)
})

test('quality hook resolves a Windows npm shim to its JS entry point without executing cmd text', () => {
  const project = mkdtempSync(join(tmpdir(), 'openspec pnpm shim '))
  try {
    const cli = join(project, 'node_modules', 'pnpm', 'bin')
    mkdirSync(cli, { recursive: true })
    writeFileSync(join(project, 'pnpm.cmd'), '@echo off\nexit /b 99\n')
    writeFileSync(join(cli, 'pnpm.cjs'), 'require("node:fs").writeFileSync("native-cli.json", JSON.stringify(process.argv.slice(2)))\n')
    const result = runHook('codex-openspec-archive-quality-gate', { tool_input: { cmd: command } }, { CODEX_PROJECT_DIR: project, PNPM_BIN: join(project, 'pnpm.cmd') })
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(readFileSync(join(project, 'native-cli.json'), 'utf8')), ['run', 'validate'])
  } finally { rmSync(project, { recursive: true, force: true }) }
})

test('native CLI resolution supports local npm bin shims and explicit JavaScript entry points', () => {
  const project = mkdtempSync(join(tmpdir(), 'openspec local npm '))
  try {
    const modules = join(project, 'node_modules')
    const bin = join(modules, '.bin')
    const cli = join(modules, 'pnpm', 'bin')
    mkdirSync(bin, { recursive: true })
    mkdirSync(cli, { recursive: true })
    const pnpmShim = join(bin, 'pnpm.cmd')
    const pnpmScript = join(cli, 'pnpm.cjs')
    writeFileSync(pnpmShim, '@echo off\nexit /b 99\n')
    writeFileSync(pnpmScript, 'console.error("local native validator ran"); process.exitCode = 7\n')
    for (const executable of [pnpmShim, pnpmScript]) {
      const result = runHook('codex-openspec-archive-quality-gate', { tool_input: { command } }, { CODEX_PROJECT_DIR: project, PNPM_BIN: executable })
      assert.equal(result.status, 2, result.stderr)
      assert.match(result.stderr, /local native validator ran/u)
    }
    const codexDir = join(modules, '@openai', 'codex', 'bin')
    mkdirSync(codexDir, { recursive: true })
    const codexShim = join(bin, 'codex.cmd')
    const receipt = join(project, 'codex-ran.txt')
    writeFileSync(codexShim, '@echo off\nexit /b 99\n')
    writeFileSync(join(codexDir, 'codex.js'), `require('node:fs').writeFileSync(${JSON.stringify(receipt)}, 'native'); console.log('{"installed":[]}')\n`)
    const result = runHook('codex-openspec-archive-discipline-gate', { tool_input: { command } }, { CODEX_PROJECT_DIR: project, CODEX_BIN: codexShim, OPL_DISCIPLINE_PLUGIN_ROOT: '' })
    assert.equal(result.status, 2, result.stderr)
    assert.match(result.stderr, /requires the enabled opl discipline plugin/u)
    assert.equal(readFileSync(receipt, 'utf8'), 'native')
  } finally { rmSync(project, { recursive: true, force: true }) }
})

test('Windows hook manifest executes with a spaced plugin root and UTF-8 stdin', { skip: process.platform !== 'win32' }, () => {
  const project = mkdtempSync(join(tmpdir(), 'OpenSpec installed space '))
  try {
    cpSync(scripts, join(project, 'scripts'), { recursive: true, filter: (path) => !path.includes('__pycache__') })
    const manifest = JSON.parse(readFileSync(join(scripts, '..', 'hooks', 'hooks.json'), 'utf8'))
    const hook = manifest.hooks.PreToolUse.find((entry) => entry.matcher.startsWith('Edit')).hooks[0]
    const rendered = hook.commandWindows.replaceAll('${PLUGIN_ROOT}', project)
    const target = 'C:\\project é\\.agents\\skills\\openspec-apply-change\\SKILL.md'
    const result = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `"${rendered}"`], {
      input: JSON.stringify({ tool_input: { file_path: target } }), encoding: 'utf8', windowsHide: true,
      windowsVerbatimArguments: true,
    })
    assert.equal(result.status, 2, result.stderr)
    assert.match(result.stderr, /stock openspec-\* skill/u)
    assert.ok(result.stderr.includes(target))
  } finally { rmSync(project, { recursive: true, force: true }) }
})

test('deferral provider accepts native active and archived change paths', () => {
  const project = mkdtempSync(join(tmpdir(), 'openspec native provider '))
  try {
    for (const path of ['repair-active-change', 'archive/2026-09-09-repair-archived-change']) {
      mkdirSync(join(project, 'openspec', 'changes', path), { recursive: true })
    }
    for (const name of ['repair-active-change', 'repair-archived-change']) {
      const result = runHook('codex-openspec-deferral-handler', { protocol_version: 1, repository_root: project, content: `Deferred to openspec\\changes\\${name}.` })
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(JSON.parse(result.stdout), { handled: true, handler: 'openspec' })
    }
    const result = runHook('codex-openspec-deferral-handler', { protocol_version: 1, repository_root: project, content: 'Deferred to openspec/changes/missing-change.' })
    assert.equal(JSON.parse(result.stdout).handled, false)
    assert.equal(JSON.parse(result.stdout).recognized, true)
  } finally { rmSync(project, { recursive: true, force: true }) }
})

test('archive discipline discovers enabled OPL and preserves hook JSON and native paths', () => {
  const project = mkdtempSync(join(tmpdir(), 'openspec native discipline '))
  try {
    const opl = join(project, 'installed OPL é')
    mkdirSync(join(opl, 'scripts'), { recursive: true })
    const receipt = join(project, 'policy-receipt.json')
    const policy = [
      'import json, os, pathlib, sys',
      'pathlib.Path(os.environ["POLICY_RECEIPT"]).write_text(json.dumps({"args": sys.argv[1:], "input": json.load(sys.stdin), "root": os.environ["OPL_DISCIPLINE_PLUGIN_ROOT"]}))',
      'print("policy blocked", file=sys.stderr)',
      'sys.exit(2)',
    ].join('\n')
    writeFileSync(join(opl, 'scripts', 'codex_discipline_policy.py'), policy)
    const cli = join(project, 'codex fixture.py')
    const installed = { installed: [{ name: 'opl', installed: true, enabled: true, source: { path: opl } }] }
    writeFileSync(cli, `print(${JSON.stringify(JSON.stringify(installed))})\n`)
    const input = { transcript_path: join(project, 'transcript é.jsonl'), tool_input: { cmd: command } }
    const environment = { CODEX_BIN: cli, OPL_DISCIPLINE_PLUGIN_ROOT: '', CODEX_PROJECT_DIR: project, POLICY_RECEIPT: receipt }
    const result = runHook('codex-openspec-archive-discipline-gate', input, environment)
    assert.equal(result.status, 2, result.stderr)
    assert.match(result.stderr, /policy blocked/u)
    assert.deepEqual(JSON.parse(readFileSync(receipt, 'utf8')), { args: ['archive', join(project, 'openspec', 'changes', 'current-change')], input, root: opl })
    installed.installed[0].enabled = false
    writeFileSync(cli, `print(${JSON.stringify(JSON.stringify(installed))})\n`)
    const disabled = runHook('codex-openspec-archive-discipline-gate', input, environment)
    assert.equal(disabled.status, 2)
    assert.match(disabled.stderr, /requires the enabled opl discipline plugin/u)
  } finally { rmSync(project, { recursive: true, force: true }) }
})

test('stock guard recognizes native Windows paths', () => {
  const result = runHook('codex-stock-openspec-guard', { tool_input: { file_path: 'C:\\project\\.agents\\skills\\openspec-apply-change\\SKILL.md' } })
  assert.equal(result.status, 2, result.stderr)
  assert.match(result.stderr, /stock openspec-\* skill/u)
  assert.equal(runHook('codex-stock-openspec-guard', { tool_input: { file_path: 'C:\\project\\src\\index.py' } }).status, 0)
})
