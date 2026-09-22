import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const script = fileURLToPath(new URL('../../../plugins/opl-openspec/skills/openspec-x-audit/scripts/spec_inventory.mjs', import.meta.url))

test('inventory discovers nested capabilities and filters by full path without following links', () => {
  const root = mkdtempSync(join(tmpdir(), 'openspec-inventory-'))
  try {
    const specs = join(root, 'openspec', 'specs')
    for (const capability of ['auth', 'identity/auth', 'billing/auth', 'identity/auth/tokens', '.draft/auth']) {
      const directory = join(specs, capability)
      mkdirSync(directory, { recursive: true })
      writeFileSync(join(directory, 'spec.md'), `# ${capability}\n\n## Requirements\n\n### Requirement: Login\nThe system SHALL authenticate.\n\n#### Scenario: Success\n- **WHEN** credentials match\n- **THEN** accept\n`)
    }
    symlinkSync(specs, join(specs, 'cycle'), process.platform === 'win32' ? 'junction' : 'dir')
    const run = (...args) => spawnSync(process.execPath, [script, '--root', root, ...args], { encoding: 'utf8', timeout: 5000 })
    const all = run('--json')
    assert.equal(all.status, 0, all.stderr)
    assert.deepEqual(JSON.parse(all.stdout).specs.map((spec) => spec.capability), ['auth', 'billing/auth', 'identity/auth', 'identity/auth/tokens'])
    const focused = run('--capability', 'identity/auth', '--json')
    assert.equal(focused.status, 0, focused.stderr)
    const [spec] = JSON.parse(focused.stdout).specs
    assert.equal(spec.capability, 'identity/auth')
    assert.equal(spec.requirements[0].scenarios[0].name, 'Success')
    assert.equal(spec.requirements[0].line, 5)
    assert.match(run('--capability', 'identity/auth', '--markdown').stdout, /## identity\/auth \(1 requirements, 1 scenarios\)/u)
    assert.notEqual(run('--capability', 'identity', '--json').status, 0)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('inventory ignores metadata and fenced examples and normalizes closing heading markers', () => {
  const root = mkdtempSync(join(tmpdir(), 'openspec-markdown-'))
  try {
    const directory = join(root, 'openspec', 'specs', 'identity', 'auth')
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, 'spec.md'), [
      '---', 'domain: identity', 'example: |', '### Requirement: Metadata example', '---',
      '# Auth', '## Requirements', '### Requirement: Login ###', 'The system SHALL authenticate.',
      '#### Scenario: Success ####', '- **WHEN** credentials match', '- **THEN** access MUST be granted.',
      '```markdown', '### Requirement: Fenced fake', 'The system MUST not inventory this.', '```',
      '~~~markdown', '#### Scenario: Another fake', '~~~',
      '## Notes', 'Notes SHOULD not attach to Login.', '',
    ].join('\n'))
    const result = spawnSync(process.execPath, [script, '--root', root, '--json'], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    const [spec] = JSON.parse(result.stdout).specs
    assert.equal(spec.frontmatter.domain, 'identity')
    assert.deepEqual(spec.requirements, [{ name: 'Login', line: 8,
      normative: [{ line: 9, text: 'The system SHALL authenticate.' }],
      scenarios: [{ name: 'Success', line: 10, normative: [{ line: 12, text: '- **THEN** access MUST be granted.' }] }],
    }])
  } finally { rmSync(root, { recursive: true, force: true }) }
})
