import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const pluginRoot = resolve(new URL('..', import.meta.url).pathname)
const repositoryRoot = resolve(pluginRoot, '..', '..')
const openspecPluginRoot = join(repositoryRoot, 'plugins', 'opl-openspec')
function runHookStatus(name, input, env = {}, root = pluginRoot) {
  try {
    const stdout = execFileSync('bash', [join(root, 'scripts', name)], {
      cwd: env.CODEX_PROJECT_DIR ?? pluginRoot,
      env: { ...process.env, ...env },
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

function fakeCodexWithEnabledPlugin(pluginPath) {
  const dir = mkdtempSync(join(tmpdir(), 'opl-codex-cli-'))
  const file = join(dir, 'codex')
  const payload = JSON.stringify({
    installed: [
      {
        installed: true,
        enabled: true,
        source: { path: pluginPath },
      },
    ],
  })
  writeFileSync(file, `#!/bin/bash\nprintf '%s\\n' '${payload}'\n`)
  chmodSync(file, 0o755)
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
    'codex-response-discipline-gate.sh',
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
      'codex-openspec-deferral-handler.sh',
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
            'codex-openspec-deferral-handler.sh',
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
            'codex-openspec-deferral-handler.sh',
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
  const result = runHookStatus('codex-artifact-discipline-gate.sh', {
    tool_input: {
      file_path: '/tmp/example.js',
      new_string: '// TODO: repair the warp core',
    },
  })
  assert.equal(result.status, 2)
  assert.match(result.stderr, /TODO/)
})

test('artifact blocks an unresolved TODO introduced by apply_patch', () => {
  const result = runHookStatus('codex-artifact-discipline-gate.sh', {
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
      'codex-artifact-discipline-gate.sh',
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
      'codex-openspec-archive-discipline-gate.sh',
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
          'codex-openspec-deferral-handler.sh',
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
      'codex-openspec-archive-discipline-gate.sh',
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
          'codex-openspec-deferral-handler.sh',
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
      'codex-openspec-archive-discipline-gate.sh',
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
          'codex-openspec-deferral-handler.sh',
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
      'codex-openspec-archive-discipline-gate.sh',
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
          'codex-openspec-deferral-handler.sh',
        ),
      },
      openspecPluginRoot,
    )
    assert.equal(result.status, 2)
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})
