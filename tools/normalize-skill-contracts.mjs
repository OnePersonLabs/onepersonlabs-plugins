#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const repoRoot = resolve(new URL('..', import.meta.url).pathname)
const marketplace = JSON.parse(readFileSync(join(repoRoot, '.agents', 'plugins', 'marketplace.json'), 'utf8'))
const casesRoot = join(repoRoot, 'tests', 'evals', 'cases')

function displayName(name) {
  return name.split('-').map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part).join(' ')
}

function shippedSkills(pluginRoot, manifest) {
  if (typeof manifest.skills !== 'string') return []
  const root = resolve(pluginRoot, manifest.skills)
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter((item) => item.isDirectory() && existsSync(join(root, item.name, 'SKILL.md')))
    .map((item) => ({ name: item.name, root: join(root, item.name) }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

function normalizeSkill(skill) {
  const skillPath = join(skill.root, 'SKILL.md')
  let text = readFileSync(skillPath, 'utf8')
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/u)
  if (!frontmatter) throw new Error(`${skillPath}: missing YAML frontmatter`)

  const openaiPath = join(skill.root, 'agents', 'openai.yaml')
  let openai = existsSync(openaiPath) ? readFileSync(openaiPath, 'utf8') : ''
  const disabled = frontmatter[1].match(/^disable-model-invocation:\s*(true|false)/mu)?.[1]
  const existingAllow = openai.match(/allow_implicit_invocation:\s*(true|false)/u)?.[1]
  const allow = disabled ? disabled === 'false' : existingAllow ? existingAllow === 'true' : true

  let normalizedFrontmatter = frontmatter[1]
  if (disabled) {
    normalizedFrontmatter = normalizedFrontmatter.replace(
      /^disable-model-invocation:\s*(?:true|false).*$/mu,
      `disable-model-invocation: ${allow ? 'false' : 'true'}`,
    )
  } else {
    normalizedFrontmatter = `${normalizedFrontmatter}\ndisable-model-invocation: ${allow ? 'false' : 'true'}`
  }
  text = text.replace(frontmatter[0], `---\n${normalizedFrontmatter}\n---`)
  writeFileSync(skillPath, text)

  if (!openai) {
    openai = [
      'interface:',
      `  display_name: ${JSON.stringify(displayName(skill.name))}`,
      `  short_description: ${JSON.stringify(`Use the ${displayName(skill.name)} workflow`)}`,
      '',
      'policy:',
      `  allow_implicit_invocation: ${allow}`,
      '',
    ].join('\n')
  } else if (/allow_implicit_invocation:\s*(?:true|false)/u.test(openai)) {
    openai = openai.replace(
      /allow_implicit_invocation:\s*(?:true|false)/u,
      `allow_implicit_invocation: ${allow}`,
    )
  } else {
    openai = `${openai.trimEnd()}\n\npolicy:\n  allow_implicit_invocation: ${allow}\n`
  }
  mkdirSync(join(skill.root, 'agents'), { recursive: true })
  writeFileSync(openaiPath, openai)
  return allow
}

mkdirSync(casesRoot, { recursive: true })
let skillCount = 0
for (const entry of marketplace.plugins) {
  const pluginRoot = resolve(repoRoot, entry.source.path)
  const manifest = JSON.parse(readFileSync(join(pluginRoot, '.codex-plugin', 'plugin.json'), 'utf8'))
  const cases = []
  for (const skill of shippedSkills(pluginRoot, manifest)) {
    const allow = normalizeSkill(skill)
    skillCount += 1
    cases.push(
      {
        id: `${skill.name}:direct`,
        skill: skill.name,
        kind: 'direct',
        prompt: `Use $${skill.name} for a representative request. Announce the skill you are using before doing any work, then briefly describe the first workflow step.`,
        should_activate: true,
      },
      {
        id: `${skill.name}:indirect`,
        skill: skill.name,
        kind: 'indirect',
        prompt: `Handle a representative request suited to the ${displayName(skill.name)} workflow. Announce any skill you choose before doing any work, then briefly describe the first workflow step.`,
        should_activate: allow,
      },
      {
        id: `${skill.name}:negative`,
        skill: skill.name,
        kind: 'negative',
        prompt: `Define the ordinary English word "plugin" in one sentence. Do not invoke $${skill.name} or any specialized workflow.`,
        should_activate: false,
      },
    )
  }
  writeFileSync(join(casesRoot, `${entry.name}.jsonl`), cases.map((item) => JSON.stringify(item)).join('\n') + (cases.length ? '\n' : ''))
}

console.log(`Normalized invocation contracts and retained smoke cases for ${skillCount} shipped skills.`)
