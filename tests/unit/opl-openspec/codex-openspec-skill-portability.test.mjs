import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

const repositoryRoot = resolve(new URL('../../..', import.meta.url).pathname)
const skillPath = join(repositoryRoot, 'plugins', 'opl-openspec', 'skills', 'openspec-x-audit', 'SKILL.md')
const skill = readFileSync(skillPath, 'utf8')

test('audit inventory command resolves from the loaded skill directory', () => {
  assert.doesNotMatch(
    skill,
    /node\s+\.agents\/skills\/openspec-x-audit\/scripts\/spec_inventory\.mjs/u,
  )
  assert.match(
    skill,
    /AUDIT_SKILL_DIR="<absolute path of the directory containing this SKILL\.md>"/u,
  )
  assert.match(
    skill,
    /node "\$\{AUDIT_SKILL_DIR\}\/scripts\/spec_inventory\.mjs" --markdown/u,
  )
})
