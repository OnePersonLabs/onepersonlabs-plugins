import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

const pluginRoot = resolve(new URL('..', import.meta.url).pathname)
const gate = join(pluginRoot, 'scripts', 'codex-openspec-workflow-gate.sh')

function writeTranscript(records) {
  const dir = mkdtempSync(join(tmpdir(), 'opl-openspec-workflow-'))
  const file = join(dir, 'transcript.jsonl')
  writeFileSync(file, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`)
  return { dir, file }
}

function runGate(records) {
  const transcript = writeTranscript(records)
  try {
    return JSON.parse(
      execFileSync('bash', [gate], {
        input: JSON.stringify({ transcript_path: transcript.file }),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }),
    )
  } finally {
    rmSync(transcript.dir, { recursive: true, force: true })
  }
}

function patch(path) {
  return {
    payload: {
      type: 'custom_tool_call',
      name: 'apply_patch',
      input: [
        '*** Begin Patch',
        `*** Update File: ${path}`,
        '@@',
        '+changed',
        '*** End Patch',
      ].join('\n'),
    },
  }
}

function skillRead(path) {
  return {
    payload: {
      type: 'function_call',
      name: 'exec_command',
      arguments: JSON.stringify({ cmd: `sed -n '1,240p' ${path}` }),
    },
  }
}

test('workflow gate blocks an active artifact edit without workflow entry', () => {
  const decision = runGate([
    patch('openspec/changes/add-example/proposal.md'),
  ])
  assert.equal(decision.decision, 'block')
  assert.match(decision.reason, /add-example\/proposal\.md/u)
})

test('workflow gate blocks nested capability spec edits without workflow entry', () => {
  const decision = runGate([
    patch('openspec/changes/add-example/specs/identity/user-auth/spec.md'),
  ])
  assert.equal(decision.decision, 'block')
  assert.match(decision.reason, /identity\/user-auth\/spec\.md/u)
})

test('workflow gate ignores placeholder artifact paths', () => {
  const decision = runGate([
    patch('docs/open-spec-example.md'),
    {
      message: {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Example: openspec/changes/<change>/specs/<capability>/spec.md',
          },
        ],
      },
    },
  ])
  assert.equal(decision.continue, true)
})

for (const [label, path] of [
  [
    'repository-local',
    '.agents/skills/openspec-apply-change/SKILL.md',
  ],
  [
    'installed plugin cache',
    '/home/test/.codex/plugins/cache/acme/opl-openspec/1.2.3/skills/openspec-propose/SKILL.md',
  ],
  [
    'plugin source checkout',
    '/work/plugins/opl-openspec/skills/openspec-x-finish/SKILL.md',
  ],
]) {
  test(`workflow gate accepts ${label} OpenSpec skill entry`, () => {
    const decision = runGate([
      skillRead(path),
      patch('openspec/changes/add-example/tasks.md'),
    ])
    assert.equal(decision.continue, true)
  })
}

test('workflow gate accepts the documented repair sequence', () => {
  const decision = runGate([
    patch('openspec/changes/add-example/design.md'),
    {
      payload: {
        type: 'function_call',
        name: 'exec_command',
        arguments: JSON.stringify({
          cmd: 'openspec instructions design --change add-example --json',
        }),
      },
    },
    {
      payload: {
        type: 'function_call',
        name: 'exec_command',
        arguments: JSON.stringify({
          cmd: 'openspec validate add-example --strict',
        }),
      },
    },
  ])
  assert.equal(decision.continue, true)
})

test('workflow gate rejects a repair sequence for another change', () => {
  const decision = runGate([
    patch('openspec/changes/add-example/design.md'),
    {
      payload: {
        type: 'function_call',
        name: 'exec_command',
        arguments: JSON.stringify({
          cmd: 'openspec instructions design --change other-change --json',
        }),
      },
    },
    {
      payload: {
        type: 'function_call',
        name: 'exec_command',
        arguments: JSON.stringify({
          cmd: 'openspec validate other-change --strict',
        }),
      },
    },
  ])
  assert.equal(decision.decision, 'block')
})
