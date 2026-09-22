#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)

const optionValue = (name) => {
  const index = args.indexOf(name)
  if (index === -1) return null
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`)
  }
  return value
}

const hasFlag = (name) => args.includes(name)

const repoRoot = path.resolve(
  optionValue('--root') ?? process.env.CODEX_PROJECT_DIR ?? process.cwd(),
)
const specsRoot = path.join(repoRoot, 'openspec', 'specs')
const capabilityFilter = optionValue('--capability')
const asJson = hasFlag('--json')

if (!existsSync(specsRoot)) {
  throw new Error(`OpenSpec specs root not found: ${specsRoot}`)
}

const parseFrontmatter = (lines) => {
  if (lines[0] !== '---') return { frontmatter: {}, bodyStart: 0 }

  const frontmatter = {}
  let index = 1
  for (; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === '---') break
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (match) {
      frontmatter[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }

  return { frontmatter, bodyStart: index + 1 }
}

const normativePattern = /\b(SHALL|MUST|SHOULD|MAY)\b/

const parseSpec = (capability) => {
  const file = path.join(specsRoot, capability, 'spec.md')
  const content = readFileSync(file, 'utf8')
  const lines = content.split(/\r?\n/)
  const { frontmatter, bodyStart } = parseFrontmatter(lines)
  const requirements = []
  let currentRequirement = null
  let currentScenario = null
  let fence = null

  const pushNormative = (lineNumber, text) => {
    if (!normativePattern.test(text)) return
    const target = currentScenario ?? currentRequirement
    if (!target) return
    target.normative.push({ line: lineNumber, text })
  }

  lines.forEach((line, index) => {
    if (index < bodyStart) return
    const lineNumber = index + 1
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length && !fenceMatch[2].trim()) fence = null
      return
    }
    if (fenceMatch) {
      fence = fenceMatch[1]
      return
    }
    const heading = line.replace(/\s+#+\s*$/, '').trimEnd()
    const requirementMatch = /^ {0,3}### Requirement:\s*(.+?)\s*$/.exec(heading)
    if (requirementMatch) {
      currentRequirement = {
        name: requirementMatch[1],
        line: lineNumber,
        scenarios: [],
        normative: [],
      }
      requirements.push(currentRequirement)
      currentScenario = null
      return
    }

    const scenarioMatch = /^ {0,3}#### Scenario:\s*(.+?)\s*$/.exec(heading)
    if (scenarioMatch && currentRequirement) {
      currentScenario = {
        name: scenarioMatch[1],
        line: lineNumber,
        normative: [],
      }
      currentRequirement.scenarios.push(currentScenario)
      return
    }

    if (/^ {0,3}#{1,3}\s/.test(heading)) {
      currentRequirement = null
      currentScenario = null
    } else if (/^ {0,3}####\s/.test(heading)) {
      currentScenario = null
    }

    pushNormative(lineNumber, line.trim())
  })

  return {
    capability,
    file: path.relative(repoRoot, file),
    frontmatter,
    requirements,
  }
}

// Preserve the entire relative capability path, including duplicate leaf names.
// Dirent checks deliberately avoid following directory symlinks or junctions.
const discoverCapabilities = (directory, prefix = '') => {
  const entries = readdirSync(directory, { withFileTypes: true }).filter((entry) => !entry.name.startsWith('.'))
  const found = prefix && entries.some((entry) => entry.name === 'spec.md' && entry.isFile())
    ? [prefix]
    : []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      found.push(...discoverCapabilities(path.join(directory, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name))
    }
  }
  return found
}

const capabilities = discoverCapabilities(specsRoot)
  .filter((capability) => !capabilityFilter || capability === capabilityFilter)
  .sort()

if (capabilityFilter && capabilities.length === 0) {
  throw new Error(`Spec capability not found: ${capabilityFilter}`)
}

const inventory = capabilities.map(parseSpec)

if (asJson) {
  process.stdout.write(`${JSON.stringify({ specs: inventory }, null, 2)}\n`)
} else {
  for (const spec of inventory) {
    const requirementCount = spec.requirements.length
    const scenarioCount = spec.requirements.reduce(
      (total, requirement) => total + requirement.scenarios.length,
      0,
    )
    const domain = spec.frontmatter.domain
      ? ` domain=${spec.frontmatter.domain}`
      : ''
    const packageName = spec.frontmatter.package
      ? ` package=${spec.frontmatter.package}`
      : ''

    process.stdout.write(
      `## ${spec.capability} (${requirementCount} requirements, ${scenarioCount} scenarios)${domain}${packageName}\n`,
    )
    process.stdout.write(`${spec.file}\n`)

    for (const requirement of spec.requirements) {
      process.stdout.write(`- R:${requirement.line} ${requirement.name}\n`)
      for (const scenario of requirement.scenarios) {
        process.stdout.write(`  - S:${scenario.line} ${scenario.name}\n`)
      }
    }

    process.stdout.write('\n')
  }
}
