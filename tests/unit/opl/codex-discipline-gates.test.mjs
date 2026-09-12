import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pythonBin } from '../../../tools/runtime.mjs'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const pluginRoot = join(repositoryRoot, 'plugins', 'opl')
const openspecPluginRoot = join(repositoryRoot, 'plugins', 'opl-openspec')
const githubIssueHandler = join(
  pluginRoot,
  'scripts',
  'codex-github-issues-deferral-handler.py',
)
function runHookStatus(name, input, env = {}, root = pluginRoot) {
  try {
    const stdout = execFileSync(pythonBin(), ['-B', '-X', 'utf8', join(root, 'scripts', name)], {
      cwd: env.CODEX_PROJECT_DIR ?? pluginRoot,
      env: { ...process.env, NODE_BIN: process.execPath, CODEX_BIN: join(repositoryRoot, 'missing-test-codex'), ...env },
      input: JSON.stringify(input),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { status: 0, stdout, stderr: '' }
  } catch (error) {
    return {
      status: error.status,
      stdout: error.stdout?.toString() ?? '',
      stderr: error.stderr?.toString() ?? '',
    }
  }
}

function makeProject() {
  return mkdtempSync(join(tmpdir(), 'opl-discipline-test-'))
}

function fakeCodexWithEnabledPlugin(pluginPath, { installedPath = false, localShim = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'opl-codex-cli-'))
  const file = localShim ? join(dir, 'node_modules', '.bin', 'codex.cmd') : join(dir, 'codex.mjs')
  const payload = JSON.stringify({
    installed: [
      {
        installed: true,
        enabled: true,
        ...(installedPath ? { installedPath: pluginPath } : { source: { path: pluginPath } }),
      },
    ],
  })
  if (localShim) {
    const owner = join(dir, 'node_modules', '@openai', 'codex', 'bin', 'codex.js')
    mkdirSync(dirname(file), { recursive: true })
    mkdirSync(dirname(owner), { recursive: true })
    writeFileSync(file, '@echo off\r\nexit /b 99\r\n')
    writeFileSync(owner, `console.log(${JSON.stringify(payload)})\n`)
  } else {
    writeFileSync(file, `console.log(${JSON.stringify(payload)})\n`)
  }
  return { dir, file }
}

function fakeGhIssue({ number = 42, state = 'OPEN' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'opl-gh-cli-'))
  const file = join(dir, 'gh.mjs')
  writeFileSync(
    file,
    [
      "const [command, action, ref] = process.argv.slice(2)",
      "if (command !== 'issue' || action !== 'view') process.exit(64)",
      `if (ref !== '${number}' && !ref.endsWith('/issues/${number}')) process.exit(1)`,
      `console.log(JSON.stringify({number:${number},state:${JSON.stringify(state)},url:'https://github.com/acme/example/issues/${number}'}))`,
      '',
    ].join('\n'),
  )
  return { dir, file }
}

function writeTranscript(records) {
  const dir = mkdtempSync(join(tmpdir(), 'opl-discipline-transcript-'))
  const file = join(dir, 'transcript.jsonl')
  writeFileSync(file, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`)
  return { dir, file }
}

function assistant(text) {
  return { message: { role: 'assistant', content: [{ type: 'text', text }] } }
}

function linearProof({
  toolName = 'mcp__codex_apps__linear_get_issue',
  identifier,
  title,
  success = true,
}) {
  const callId = `call-${identifier}`
  return [
    {
      type: 'function_call',
      name: toolName,
      call_id: callId,
      arguments: JSON.stringify({ id: identifier }),
    },
    {
      type: 'function_call_output',
      call_id: callId,
      output: success
        ? JSON.stringify({ issue: { identifier, title } })
        : JSON.stringify({ error: 'not found' }),
    },
  ]
}

function runResponse(text, { project, priorRecords = [], env = {} } = {}) {
  const transcript = writeTranscript([...priorRecords, assistant(text)])
  const result = runHookStatus(
    'codex-response-discipline-gate.py',
    { transcript_path: transcript.file },
    { CODEX_PROJECT_DIR: project ?? pluginRoot, ...env },
  )
  rmSync(transcript.dir, { recursive: true, force: true })
  return result
}

function responseDecision(result) {
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

test('response blocks an ephemeral deferral without a durable sink', () => {
  const decision = responseDecision(runResponse('We can defer this work.'))
  assert.equal(decision.decision, 'block')
  assert.match(decision.reason, /defer/i)
})

test('post-tool skill and AGENTS edits cue a review after related changes', () => {
  for (const path of ['C:\\work\\skills\\example\\SKILL.md', 'C:\\work\\AGENTS.md', 'SKILL.md', 'AGENTS.md']) {
    const result = runHookStatus('codex-skill-review-gate.py', {
      hook_event_name: 'PostToolUse',
      tool_name: 'apply_patch',
      tool_input: { command: `*** Begin Patch\n*** Update File: ${path}\n@@\n+Updated\n*** End Patch` },
      tool_response: { exit_code: 0 },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /\$opl:agent-instructions/u)
  }
  for (const tool_name of ['Edit', 'Write']) {
    const result = runHookStatus('codex-skill-review-gate.py', {
      hook_event_name: 'PostToolUse', tool_name,
      tool_input: { file_path: 'AGENTS.md' },
    })
    assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /\$opl:agent-instructions/u)
  }
})

test('post-tool reads and unrelated edits do not cue an instruction review', () => {
  for (const input of [
    { tool_name: 'Bash', tool_input: { command: 'Get-Content C:\\work\\AGENTS.md' } },
    { tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Update File: C:\\work\\README.md\n@@\n+Updated\n*** End Patch' } },
    { tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Update File: SKILL.md\n@@\n+Updated\n*** End Patch' }, tool_response: { exit_code: 1 } },
  ]) {
    const result = runHookStatus('codex-skill-review-gate.py', { hook_event_name: 'PostToolUse', ...input })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput, undefined)
  }
})

test('dangerous shell blocks PowerShell root, home, parent, and glob removals', () => {
  for (const command of [
    'Remove-Item -LiteralPath "C:\\" -Recurse -Force',
    'Remove-Item -LiteralPath $HOME -Recurse -Force',
    'Remove-Item -LiteralPath "..\\shared" -Recurse -Force',
    'Remove-Item -Path "C:\\work\\*" -Recurse -Force',
    'rtk proxy powershell -Command "Remove-Item -LiteralPath $HOME -Recurse"',
    'git push origin main --force',
    'git push -f origin main',
  ]) {
    const result = runHookStatus('codex-dangerous-shell-gate.py', { tool_input: { command } })
    assert.equal(result.status, 2, `${command}\n${result.stderr}`)
  }
})

test('dangerous shell permits explicit repository cleanup in PowerShell', () => {
  const result = runHookStatus('codex-dangerous-shell-gate.py', {
    tool_input: { command: 'Remove-Item -LiteralPath "./build output" -Recurse -Force' },
  })
  assert.equal(result.status, 0, result.stderr)
})

test('skill sigil gate discovers skills and respects same-line literal bypasses', () => {
  const project = makeProject()
  const skill = join(project, '.agents', 'skills', 'native-example')
  mkdirSync(skill, { recursive: true })
  writeFileSync(join(skill, 'SKILL.md'), '---\nname: native-example\n---\nInstructions.\n')
  const path = join(project, 'AGENTS.md')
  try {
    writeFileSync(path, 'Run `native-example`.\n')
    const result = runHookStatus('codex-skill-reference-sigil-gate.py', {
      tool_input: { file_path: path },
    }, { CODEX_PROJECT_DIR: project })
    assert.equal(result.status, 2, result.stderr)
    assert.match(result.stderr, /dollar-sigil/u)
    writeFileSync(path, 'The literal `native-example`. <!-- skill-reference-sigil-bypass -->\n')
    assert.equal(runHookStatus('codex-skill-reference-sigil-gate.py', {
      tool_input: { file_path: path },
    }, { CODEX_PROJECT_DIR: project }).status, 0)
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})

test('artifact policy keeps bypasses and per-token allowlist semantics', () => {
  const plugin = makeProject()
  mkdirSync(join(plugin, 'scripts'))
  writeFileSync(join(plugin, 'scripts', 'codex-discipline-gate.exceptions.txt'), '# A real release name\nTauri v2\n')
  const env = { OPL_DISCIPLINE_PLUGIN_ROOT: plugin, DISCIPLINE_DEFERRAL_HANDLERS: '' }
  try {
    for (const text of ['Use Tauri v2.', 'Deferred work. <!-- discipline-bypass -->']) {
      assert.equal(runHookStatus('codex-artifact-discipline-gate.py', {
        tool_input: { content: text },
      }, env).status, 0, text)
    }
    const result = runHookStatus('codex-artifact-discipline-gate.py', {
      tool_input: { content: 'Use Tauri v2 for our v1.' },
    }, env)
    assert.equal(result.status, 2)
    assert.match(result.stderr, /token: "v1"/u)
    assert.doesNotMatch(result.stderr, /token: "v2"/u)
  } finally {
    rmSync(plugin, { recursive: true, force: true })
  }
})

test('core response rejects an OpenSpec-shaped deferral when no provider handles it', () => {
  const project = makeProject()
  mkdirSync(join(project, 'openspec', 'changes', 'add-photon-torpedoes'), {
    recursive: true,
  })
  try {
    const decision = responseDecision(
      runResponse(
        'Deferred to openspec/changes/add-photon-torpedoes/.',
        {
          project,
          env: { DISCIPLINE_DEFERRAL_HANDLERS: '' },
        },
      ),
    )
    assert.equal(decision.decision, 'block')
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})

test('OpenSpec provider handles an existing active change', () => {
  const project = makeProject()
  mkdirSync(join(project, 'openspec', 'changes', 'add-photon-torpedoes'), {
    recursive: true,
  })
  try {
    const result = runHookStatus(
      'codex-openspec-deferral-handler.py',
      {
        protocol_version: 1,
        content: 'Deferred to openspec/changes/add-photon-torpedoes/.',
        repository_root: project,
      },
      { CODEX_PROJECT_DIR: project },
      openspecPluginRoot,
    )
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout), {
      handled: true,
      handler: 'openspec',
    })
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})

test('core response accepts a deferral consumed by the OpenSpec provider', () => {
  const project = makeProject()
  mkdirSync(join(project, 'openspec', 'changes', 'add-photon-torpedoes'), {
    recursive: true,
  })
  try {
    const decision = responseDecision(
      runResponse('Deferred to openspec/changes/add-photon-torpedoes/.', {
        project,
        env: {
          DISCIPLINE_DEFERRAL_HANDLERS: join(
            openspecPluginRoot,
            'scripts',
            'codex-openspec-deferral-handler.py',
          ),
        },
      }),
    )
    assert.equal(decision.continue, true)
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})

test('core discovers deferral handlers from enabled Codex plugins', () => {
  const project = makeProject()
  const fakeCodex = fakeCodexWithEnabledPlugin(openspecPluginRoot)
  mkdirSync(join(project, 'openspec', 'changes', 'add-photon-torpedoes'), {
    recursive: true,
  })
  try {
    const decision = responseDecision(
      runResponse('Deferred to openspec/changes/add-photon-torpedoes/.', {
        project,
        env: { CODEX_BIN: fakeCodex.file },
      }),
    )
    assert.equal(decision.continue, true)
  } finally {
    rmSync(project, { recursive: true, force: true })
    rmSync(fakeCodex.dir, { recursive: true, force: true })
  }
})

test('core discovers providers in installed Codex cache paths', () => {
  const project = makeProject()
  const fakeCodex = fakeCodexWithEnabledPlugin(openspecPluginRoot, { installedPath: true })
  mkdirSync(join(project, 'openspec', 'changes', 'cached-change'), { recursive: true })
  try {
    assert.equal(responseDecision(runResponse('Deferred to openspec/changes/cached-change/.', {
      project,
      env: { CODEX_BIN: fakeCodex.file },
    })).continue, true)
  } finally {
    rmSync(project, { recursive: true, force: true })
    rmSync(fakeCodex.dir, { recursive: true, force: true })
  }
})

test('Windows provider discovery resolves a project-local npm Codex shim without a shell', {
  skip: process.platform !== 'win32',
}, () => {
  const project = makeProject()
  const fakeCodex = fakeCodexWithEnabledPlugin(openspecPluginRoot, { localShim: true })
  mkdirSync(join(project, 'openspec', 'changes', 'local-shim-change'), { recursive: true })
  try {
    assert.equal(responseDecision(runResponse('Deferred to openspec/changes/local-shim-change/.', {
      project,
      env: { CODEX_BIN: fakeCodex.file },
    })).continue, true)
  } finally {
    rmSync(project, { recursive: true, force: true })
    rmSync(fakeCodex.dir, { recursive: true, force: true })
  }
})

test('GitHub Issues provider handles an existing open issue', () => {
  const project = makeProject()
  const fakeGh = fakeGhIssue()
  try {
    const result = runHookStatus(
      'codex-github-issues-deferral-handler.py',
      {
        protocol_version: 1,
        content: 'Deferred to #42.',
        repository_root: project,
      },
      { CODEX_PROJECT_DIR: project, GH_BIN: fakeGh.file },
    )
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout), {
      handled: true,
      handler: 'github-issues',
    })
  } finally {
    rmSync(project, { recursive: true, force: true })
    rmSync(fakeGh.dir, { recursive: true, force: true })
  }
})

test('core discovers the GitHub Issues provider from the enabled OPL plugin', () => {
  const project = makeProject()
  const fakeGh = fakeGhIssue()
  const fakeCodex = fakeCodexWithEnabledPlugin(pluginRoot)
  try {
    const decision = responseDecision(
      runResponse('Deferred to #42.', {
        project,
        env: {
          CODEX_BIN: fakeCodex.file,
          GH_BIN: fakeGh.file,
        },
      }),
    )
    assert.equal(decision.continue, true)
  } finally {
    rmSync(project, { recursive: true, force: true })
    rmSync(fakeGh.dir, { recursive: true, force: true })
    rmSync(fakeCodex.dir, { recursive: true, force: true })
  }
})

test('core response accepts a deferral backed by an existing GitHub issue', () => {
  const project = makeProject()
  const fakeGh = fakeGhIssue()
  try {
    const decision = responseDecision(
      runResponse('Deferred to #42.', {
        project,
        env: {
          DISCIPLINE_DEFERRAL_HANDLERS: githubIssueHandler,
          GH_BIN: fakeGh.file,
        },
      }),
    )
    assert.equal(decision.continue, true)
  } finally {
    rmSync(project, { recursive: true, force: true })
    rmSync(fakeGh.dir, { recursive: true, force: true })
  }
})

test('GitHub Issues provider leaves a missing issue for the catch-all to reject', () => {
  const project = makeProject()
  const fakeGh = fakeGhIssue()
  try {
    const decision = responseDecision(
      runResponse('Deferred to #404.', {
        project,
        env: {
          DISCIPLINE_DEFERRAL_HANDLERS: githubIssueHandler,
          GH_BIN: fakeGh.file,
        },
      }),
    )
    assert.equal(decision.decision, 'block')
    assert.match(decision.reason, /GitHub issue #404 could not be verified/u)
  } finally {
    rmSync(project, { recursive: true, force: true })
    rmSync(fakeGh.dir, { recursive: true, force: true })
  }
})

test('GitHub Issues provider rejects a closed issue as a deferral sink', () => {
  const project = makeProject()
  const fakeGh = fakeGhIssue({ state: 'CLOSED' })
  try {
    const decision = responseDecision(
      runResponse('Deferred to https://github.com/acme/example/issues/42.', {
        project,
        env: {
          DISCIPLINE_DEFERRAL_HANDLERS: githubIssueHandler,
          GH_BIN: fakeGh.file,
        },
      }),
    )
    assert.equal(decision.decision, 'block')
    assert.match(decision.reason, /GitHub issue .* is CLOSED/u)
  } finally {
    rmSync(project, { recursive: true, force: true })
    rmSync(fakeGh.dir, { recursive: true, force: true })
  }
})

test('OpenSpec provider leaves a missing change for the catch-all to reject', () => {
  const project = makeProject()
  try {
    const decision = responseDecision(
      runResponse('Deferred to openspec/changes/missing-photon-torpedoes/.', {
        project,
        env: {
          DISCIPLINE_DEFERRAL_HANDLERS: join(
            openspecPluginRoot,
            'scripts',
            'codex-openspec-deferral-handler.py',
          ),
        },
      }),
    )
    assert.equal(decision.decision, 'block')
    assert.match(decision.reason, /OpenSpec deferral handler found no matching/i)
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})

test('core response blocks Linear proof when no provider handles Linear', () => {
  const title = 'Add photon torpedoes to shuttle'
  const decision = responseDecision(
    runResponse(`Deferred to ONE-7: ${title}`, {
      priorRecords: linearProof({ identifier: 'ONE-7', title }),
      env: { DISCIPLINE_DEFERRAL_HANDLERS: '' },
    }),
  )
  assert.equal(decision.decision, 'block')
})

test('response blocks Linear syntax without tool-result proof', () => {
  const decision = responseDecision(
    runResponse('Deferred to ONE-7: Add photon torpedoes to shuttle'),
  )
  assert.equal(decision.decision, 'block')
  assert.match(decision.reason, /Linear proof|ONE-7/i)
})

test('response blocks a Linear title mismatch', () => {
  const decision = responseDecision(
    runResponse('Deferred to ONE-7: Add photon torpedoes to shuttle', {
      priorRecords: linearProof({
        identifier: 'ONE-7',
        title: 'Add coffee maker to shuttle',
      }),
    }),
  )
  assert.equal(decision.decision, 'block')
})

test('response rejects matching Linear text outside a tool result', () => {
  const identifier = 'ONE-7'
  const title = 'Add photon torpedoes to shuttle'
  const decision = responseDecision(
    runResponse(`Deferred to ${identifier}: ${title}`, {
      priorRecords: [
        {
          type: 'function_call',
          name: 'mcp__codex_apps__linear_get_issue',
          call_id: 'call-ONE-7',
          arguments: JSON.stringify({ id: identifier }),
        },
        {
          type: 'assistant_note',
          call_id: 'call-ONE-7',
          content: { identifier, title },
        },
      ],
    }),
  )
  assert.equal(decision.decision, 'block')
})

test('response blocks MVP framing even beside a valid sink', () => {
  const title = 'Add photon torpedoes to shuttle'
  const decision = responseDecision(
    runResponse(`Deferred to ONE-7: ${title}\nGood enough for v1.`, {
      priorRecords: linearProof({ identifier: 'ONE-7', title }),
    }),
  )
  assert.equal(decision.decision, 'block')
  assert.match(decision.reason, /MVP framing/)
})

test('artifact blocks a newly inserted TODO without a sink', () => {
  const result = runHookStatus('codex-artifact-discipline-gate.py', {
    tool_input: {
      file_path: '/tmp/example.js',
      new_string: '// TODO: repair the warp core',
    },
  })
  assert.equal(result.status, 2)
  assert.match(result.stderr, /TODO/)
})

test('artifact blocks an unresolved TODO introduced by apply_patch', () => {
  const result = runHookStatus('codex-artifact-discipline-gate.py', {
    tool_input: {
      patch: [
        '*** Begin Patch',
        '*** Update File: example.js',
        '@@',
        '+// TODO: repair the warp core',
        '*** End Patch',
      ].join('\n'),
    },
  })
  assert.equal(result.status, 2)
  assert.match(result.stderr, /TODO/)
})

test('artifact catch-all blocks Linear TODO without a Linear provider', () => {
  const title = 'Repair warp core'
  const transcript = writeTranscript(
    linearProof({
      toolName: 'mcp__codex_apps__linear_save_issue',
      identifier: 'ENG-1778',
      title,
    }),
  )
  try {
    const result = runHookStatus(
      'codex-artifact-discipline-gate.py',
      {
        transcript_path: transcript.file,
        tool_input: {
          file_path: '/tmp/example.js',
          new_string: `// TODO ENG-1778: ${title}`,
        },
      },
      { DISCIPLINE_DEFERRAL_HANDLERS: '' },
    )
    assert.equal(result.status, 2)
  } finally {
    rmSync(transcript.dir, { recursive: true, force: true })
  }
})

test('archive scans every markdown file in the change', () => {
  const project = makeProject()
  const change = join(project, 'openspec', 'changes', 'current-change')
  mkdirSync(change, { recursive: true })
  writeFileSync(join(change, 'tasks.md'), 'This is deferred with no durable sink.\n')
  try {
    const result = runHookStatus(
      'codex-openspec-archive-discipline-gate.py',
      {
        tool_input: {
          command:
            'mv openspec/changes/current-change openspec/changes/archive/2026-08-08-current-change',
        },
      },
      {
        CODEX_PROJECT_DIR: project,
        OPL_DISCIPLINE_PLUGIN_ROOT: pluginRoot,
        DISCIPLINE_DEFERRAL_HANDLERS: join(
          openspecPluginRoot,
          'scripts',
          'codex-openspec-deferral-handler.py',
        ),
      },
      openspecPluginRoot,
    )
    assert.equal(result.status, 2)
    assert.match(result.stderr, /tasks\.md/)
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})

test('archive recognizes option-bearing commands with quoted paths', () => {
  const project = makeProject()
  const change = join(project, 'openspec', 'changes', 'current-change')
  mkdirSync(change, { recursive: true })
  writeFileSync(join(change, 'tasks.md'), 'This is deferred with no durable sink.\n')
  try {
    const result = runHookStatus(
      'codex-openspec-archive-discipline-gate.py',
      {
        tool_input: {
          command:
            'mv -- "openspec/changes/current-change" "openspec/changes/archive/2026-08-08-current-change"',
        },
      },
      {
        CODEX_PROJECT_DIR: project,
        OPL_DISCIPLINE_PLUGIN_ROOT: pluginRoot,
        DISCIPLINE_DEFERRAL_HANDLERS: join(
          openspecPluginRoot,
          'scripts',
          'codex-openspec-deferral-handler.py',
        ),
      },
      openspecPluginRoot,
    )
    assert.equal(result.status, 2)
    assert.match(result.stderr, /tasks\.md/)
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})

test('archive accepts an archived OpenSpec change reference', () => {
  const project = makeProject()
  const change = join(project, 'openspec', 'changes', 'current-change')
  mkdirSync(change, { recursive: true })
  mkdirSync(
    join(project, 'openspec', 'changes', 'archive', '2026-08-01-repair-warp-core'),
    { recursive: true },
  )
  writeFileSync(
    join(change, 'tasks.md'),
    'Deferred to openspec/changes/repair-warp-core/.\n',
  )
  try {
    const result = runHookStatus(
      'codex-openspec-archive-discipline-gate.py',
      {
        tool_input: {
          command:
            'mv openspec/changes/current-change openspec/changes/archive/2026-08-08-current-change',
        },
      },
      {
        CODEX_PROJECT_DIR: project,
        OPL_DISCIPLINE_PLUGIN_ROOT: pluginRoot,
        DISCIPLINE_DEFERRAL_HANDLERS: join(
          openspecPluginRoot,
          'scripts',
          'codex-openspec-deferral-handler.py',
        ),
      },
      openspecPluginRoot,
    )
    assert.equal(result.status, 0, result.stderr)
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})

test('archive blocks a missing OpenSpec change', () => {
  const project = makeProject()
  const change = join(project, 'openspec', 'changes', 'current-change')
  mkdirSync(change, { recursive: true })
  writeFileSync(
    join(change, 'tasks.md'),
    'Deferred to openspec/changes/repair-warp-core/.\n',
  )
  try {
    const result = runHookStatus(
      'codex-openspec-archive-discipline-gate.py',
      {
        tool_input: {
          command:
            'mv openspec/changes/current-change openspec/changes/archive/2026-08-08-current-change',
        },
      },
      {
        CODEX_PROJECT_DIR: project,
        OPL_DISCIPLINE_PLUGIN_ROOT: pluginRoot,
        DISCIPLINE_DEFERRAL_HANDLERS: join(
          openspecPluginRoot,
          'scripts',
          'codex-openspec-deferral-handler.py',
        ),
      },
      openspecPluginRoot,
    )
    assert.equal(result.status, 2)
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})
