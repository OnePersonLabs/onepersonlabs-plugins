#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import readline from 'node:readline'

const repoRoot = resolve(new URL('..', import.meta.url).pathname)
const marketplacePath = join(repoRoot, '.agents', 'plugins', 'marketplace.json')
const matrixPath = join(repoRoot, 'tools', 'plugin-matrix.json')
const supportedHookEvents = new Set([
  'Interrupt',
  'PermissionRequest',
  'PostCompact',
  'PostToolUse',
  'PreCompact',
  'PreToolUse',
  'SessionEnd',
  'SessionStart',
  'Stop',
  'SubagentStart',
  'SubagentStop',
  'UserPromptSubmit',
])

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

const marketplace = readJson(marketplacePath)
const matrix = readJson(matrixPath)

function option(name, fallback = undefined) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) fail(`--${name} requires a value`)
  return value
}

function flag(name) {
  return process.argv.includes(`--${name}`)
}

function fail(message, status = 1) {
  console.error(`plugin-dev: ${message}`)
  process.exit(status)
}

function pluginEntries() {
  if (!Array.isArray(marketplace.plugins)) fail('marketplace plugins must be an array')
  return marketplace.plugins
}

function selectedPlugins(value = option('plugin', 'all')) {
  const entries = pluginEntries()
  if (value === 'all') return entries
  const entry = entries.find((candidate) => candidate.name === value)
  if (!entry) fail(`unknown plugin: ${value}`)
  return [entry]
}

function pluginRoot(entry) {
  const source = entry.source?.path
  if (typeof source !== 'string') fail(`${entry.name}: source.path is missing`)
  return resolve(repoRoot, source)
}

function manifestFor(entry, root = pluginRoot(entry)) {
  return readJson(join(root, '.codex-plugin', 'plugin.json'))
}

function walk(root) {
  const output = []
  if (!existsSync(root)) return output
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, item.name)
    if (item.isDirectory()) output.push(...walk(path))
    else output.push(path)
  }
  return output
}

function commandPath(root, command) {
  const match = command.match(/\$\{PLUGIN_ROOT\}\/([^"']+)/u)
  return match ? join(root, match[1]) : null
}

function commandObjects(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) commandObjects(item, output)
  } else if (value && typeof value === 'object') {
    if (typeof value.command === 'string') output.push(value)
    for (const child of Object.values(value)) commandObjects(child, output)
  }
  return output
}

function parseSkillFrontmatter(path) {
  const text = readFileSync(path, 'utf8')
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1] ?? ''
  return {
    text,
    name: block.match(/^name:\s*["']?([^\r\n"']+)/mu)?.[1]?.trim(),
    description: block.match(/^description:\s*(?:>-?\s*)?([^\r\n]+)/mu)?.[1]?.trim(),
    disabled: block.match(/^disable-model-invocation:\s*(true|false)/mu)?.[1],
  }
}

function skillsFor(entry, root = pluginRoot(entry)) {
  const manifest = manifestFor(entry, root)
  if (typeof manifest.skills !== 'string') return []
  const skillsRoot = resolve(root, manifest.skills)
  if (!existsSync(skillsRoot)) return []
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((item) => item.isDirectory() && existsSync(join(skillsRoot, item.name, 'SKILL.md')))
    .map((item) => ({ name: item.name, root: join(skillsRoot, item.name) }))
}

function within(root, candidate) {
  const path = relative(root, candidate)
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path))
}

function contractErrors(entry, root = pluginRoot(entry)) {
  const errors = []
  const manifestPath = join(root, '.codex-plugin', 'plugin.json')
  if (!existsSync(manifestPath)) return [`${entry.name}: missing .codex-plugin/plugin.json`]
  let manifest
  try {
    manifest = readJson(manifestPath)
  } catch (error) {
    return [`${entry.name}: invalid plugin manifest: ${error.message}`]
  }

  if (basename(root) !== entry.name) errors.push(`${entry.name}: source folder name differs`)
  if (manifest.name !== entry.name) errors.push(`${entry.name}: manifest name differs`)
  if (typeof manifest.version !== 'string' || !manifest.version) errors.push(`${entry.name}: version is missing`)
  if (typeof manifest.version === 'string' && /\+codex\./u.test(manifest.version)) {
    errors.push(`${entry.name}: timestamp cachebuster versions are forbidden`)
  }
  if (typeof manifest.description !== 'string' || !manifest.description.trim()) {
    errors.push(`${entry.name}: description is missing`)
  }

  for (const field of ['skills', 'mcpServers', 'hooks', 'apps', 'agents']) {
    if (manifest[field] === undefined) continue
    if (typeof manifest[field] !== 'string' || !manifest[field].startsWith('./')) {
      errors.push(`${entry.name}: ${field} must be a ./-relative path`)
      continue
    }
    const target = resolve(root, manifest[field])
    if (!within(root, target)) errors.push(`${entry.name}: ${field} escapes the plugin root`)
    if (!existsSync(target)) errors.push(`${entry.name}: ${field} path does not exist`)
  }

  const polluted = walk(root)
    .map((path) => relative(root, path))
    .filter((path) => /(^|\/)(?:tests?\/|test_[^/]*[.]py$)|[.]test[.](?:mjs|js|ts)$/u.test(path))
  for (const path of polluted) errors.push(`${entry.name}: non-runtime test file is shipped: ${path}`)

  const nestedManifests = walk(root)
    .filter((path) => path.endsWith(`${sep}.codex-plugin${sep}plugin.json`) && path !== manifestPath)
  for (const path of nestedManifests) {
    errors.push(`${entry.name}: nested plugin manifest is shipped: ${relative(root, path)}`)
  }

  if (typeof manifest.hooks === 'string' && existsSync(resolve(root, manifest.hooks))) {
    const hooksPath = resolve(root, manifest.hooks)
    const hooks = readJson(hooksPath)
    for (const event of Object.keys(hooks.hooks ?? {})) {
      if (!supportedHookEvents.has(event)) errors.push(`${entry.name}: unsupported hook event ${event}`)
    }
    for (const hook of commandObjects(hooks)) {
      if (!hook.command.includes('${PLUGIN_ROOT}')) {
        errors.push(`${entry.name}: plugin hook command must use PLUGIN_ROOT: ${hook.command}`)
        continue
      }
      const target = commandPath(root, hook.command)
      if (!target || !existsSync(target)) errors.push(`${entry.name}: hook command target is missing: ${hook.command}`)
    }
  }

  const skills = skillsFor(entry, root)
  const cases = evalCases(entry)
  const skillNames = new Set(skills.map((skill) => skill.name))
  for (const item of cases) {
    if (!skillNames.has(item.skill)) errors.push(`${entry.name}: eval case ${item.id ?? '(missing id)'} targets an unshipped skill`)
    if (typeof item.should_activate !== 'boolean') errors.push(`${entry.name}: eval case ${item.id ?? '(missing id)'} lacks boolean should_activate`)
  }
  for (const skill of skills) {
    const parsed = parseSkillFrontmatter(join(skill.root, 'SKILL.md'))
    if (parsed.name !== skill.name) errors.push(`${entry.name}/${skill.name}: frontmatter name differs`)
    if (!parsed.description) errors.push(`${entry.name}/${skill.name}: description is missing`)
    if (!['true', 'false'].includes(parsed.disabled)) {
      errors.push(`${entry.name}/${skill.name}: disable-model-invocation must be explicit`)
    }
    const openaiPath = join(skill.root, 'agents', 'openai.yaml')
    if (!existsSync(openaiPath)) {
      errors.push(`${entry.name}/${skill.name}: agents/openai.yaml is missing`)
      continue
    }
    const allow = readFileSync(openaiPath, 'utf8').match(/allow_implicit_invocation:\s*(true|false)/u)?.[1]
    if (!allow) errors.push(`${entry.name}/${skill.name}: allow_implicit_invocation must be explicit`)
    if (parsed.disabled && allow && (parsed.disabled === allow)) {
      errors.push(`${entry.name}/${skill.name}: invocation policy values are not inverse`)
    }
    const skillCases = cases.filter((item) => item.skill === skill.name)
    for (const kind of ['direct', 'indirect', 'negative']) {
      if (!skillCases.some((item) => item.kind === kind)) {
        errors.push(`${entry.name}/${skill.name}: retained ${kind} eval case is missing`)
      }
    }
  }
  return errors
}

function marketplaceErrors() {
  const errors = []
  if (matrix.schemaVersion !== 1) errors.push('plugin matrix schemaVersion must be 1')
  if (typeof marketplace.name !== 'string' || !marketplace.name) errors.push('marketplace name is missing')
  const seen = new Set()
  for (const entry of pluginEntries()) {
    if (seen.has(entry.name)) errors.push(`duplicate marketplace plugin: ${entry.name}`)
    seen.add(entry.name)
    if (entry.source?.source !== 'local') errors.push(`${entry.name}: marketplace source must be local`)
    if (entry.source?.path !== `./plugins/${entry.name}`) errors.push(`${entry.name}: marketplace source path differs`)
    if (!entry.policy?.installation || !entry.policy?.authentication || !entry.category) {
      errors.push(`${entry.name}: marketplace policy/category is incomplete`)
    }
    if (!matrix.plugins?.[entry.name]) errors.push(`${entry.name}: missing plugin matrix entry`)
  }
  for (const name of Object.keys(matrix.plugins ?? {})) {
    if (!seen.has(name)) errors.push(`${name}: stale plugin matrix entry`)
  }
  return errors
}

function runContract(entries = selectedPlugins()) {
  const errors = [...marketplaceErrors()]
  for (const entry of entries) errors.push(...contractErrors(entry))
  if (errors.length) {
    for (const error of errors) console.error(`ERROR ${error}`)
    fail(`${errors.length} contract violation(s)`)
  }
  console.log(`Contract checks passed for ${entries.length} plugin(s).`)
}

function run(arguments_, options = {}) {
  const result = spawnSync(arguments_[0], arguments_.slice(1), {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  })
  if (result.error) fail(`${arguments_[0]} failed to start: ${result.error.message}`)
  if (result.status !== 0) {
    if (options.capture) {
      if (result.stdout) process.stdout.write(result.stdout)
      if (result.stderr) process.stderr.write(result.stderr)
    }
    fail(`${arguments_.join(' ')} exited with ${result.status}`, result.status || 1)
  }
  return result.stdout?.trim() ?? ''
}

function unitFiles(root) {
  return walk(root).filter((path) => /[.]test[.]mjs$/u.test(path) || /(^|\/)test_[^/]+[.]py$/u.test(path))
}

function runUnit(entries = selectedPlugins()) {
  if (entries.length === pluginEntries().length) {
    const rootFiles = (matrix.rootUnitRoots ?? []).flatMap((root) => unitFiles(resolve(repoRoot, root)))
    const node = rootFiles.filter((path) => path.endsWith('.mjs'))
    const python = rootFiles.filter((path) => path.endsWith('.py'))
    if (node.length) run(['node', '--test', ...node])
    for (const path of python) run(['python3', path])
    console.log(`repository tools: unit checks passed (${rootFiles.length} test files).`)
  }
  for (const entry of entries) {
    const config = matrix.plugins[entry.name]
    const files = (config.unitRoots ?? []).flatMap((root) => unitFiles(resolve(repoRoot, root)))
    const node = files.filter((path) => path.endsWith('.mjs'))
    const python = files.filter((path) => path.endsWith('.py'))
    if (node.length) run(['node', '--test', ...node])
    for (const path of python) run(['python3', path])
    for (const command of config.commands ?? []) run([command.command, ...command.args], { cwd: resolve(repoRoot, command.cwd) })
    console.log(`${entry.name}: unit checks passed (${files.length} test files, ${(config.commands ?? []).length} native commands).`)
  }
}

function runFocus() {
  const file = option('file')
  if (!file) fail('focus requires --file <test>')
  const path = resolve(repoRoot, file)
  if (!existsSync(path)) fail(`focused test does not exist: ${file}`)
  if (path.endsWith('.mjs')) {
    const args = ['node', '--test']
    const name = option('name')
    if (name) args.push('--test-name-pattern', name)
    args.push(path)
    run(args)
  } else if (path.endsWith('.py')) {
    run(['python3', path])
  } else {
    fail('focused tests must be .test.mjs or test_*.py; use the native package runner for other files')
  }
}

function runMcp(entries = selectedPlugins()) {
  for (const entry of entries) {
    const mode = matrix.plugins[entry.name].mcpMode
    if (mode === 'none') {
      console.log(`${entry.name}: MCP checks not applicable.`)
      continue
    }
    const manifest = manifestFor(entry)
    const config = readJson(resolve(pluginRoot(entry), manifest.mcpServers))
    for (const [name, server] of Object.entries(config.mcpServers ?? {})) {
      const serialized = JSON.stringify(server)
      if (/@latest(?:"|$)/u.test(serialized)) fail(`${entry.name}/${name}: @latest is forbidden`)
    }
    console.log(`${entry.name}: pinned MCP launcher contracts passed.`)
  }
}

function runUi(entries = selectedPlugins()) {
  for (const entry of entries) {
    const mode = matrix.plugins[entry.name].uiMode
    if (mode === 'none') console.log(`${entry.name}: UI checks not applicable.`)
    else fail(`${entry.name}: unsupported UI mode ${mode}`)
  }
}

function stateRoot() {
  return resolve(process.env.OPL_PLUGIN_DEV_STATE ?? join(homedir(), '.local', 'state', 'onepersonlabs-plugins', 'codex'))
}

function codexBin() {
  return process.env.CODEX_BIN || 'codex'
}

function prepareSkillHost(entry) {
  const work = resolve(repoRoot, '.work', 'dev-hosts', entry.name)
  rmSync(work, { recursive: true, force: true })
  const target = join(work, '.agents', 'skills')
  mkdirSync(target, { recursive: true })
  for (const skill of skillsFor(entry)) symlinkSync(skill.root, join(target, skill.name), 'dir')
  return work
}

function evalCases(entry) {
  const path = resolve(repoRoot, 'tests', 'evals', 'cases', `${entry.name}.jsonl`)
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8').split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line))
}

function activationEvidence(text, skill) {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  return new RegExp(`(?:using|invoking|loaded|applying)[^\\n]{0,80}\\$?${escaped}`, 'iu').test(text)
}

function runEval(entries = selectedPlugins()) {
  const requestedSkill = option('skill')
  const requestedCase = option('case')
  const authoringHome = join(stateRoot(), 'authoring')
  mkdirSync(authoringHome, { recursive: true })
  const resultRoot = resolve(repoRoot, '.work', 'eval-results')
  mkdirSync(resultRoot, { recursive: true })
  for (const entry of entries) {
    const host = prepareSkillHost(entry)
    let cases = evalCases(entry)
    if (requestedSkill) cases = cases.filter((item) => item.skill === requestedSkill)
    if (requestedCase) cases = cases.filter((item) => item.id === requestedCase)
    if (!cases.length) {
      console.log(`${entry.name}: no matching skill eval cases.`)
      continue
    }
    const receipts = []
    for (const item of cases) {
      const output = run([
        codexBin(),
        'exec',
        '--ephemeral',
        '--json',
        '--ignore-user-config',
        '--sandbox',
        'read-only',
        '-m',
        matrix.evaluation.model,
        '-c',
        `model_reasoning_effort=\"${matrix.evaluation.reasoningEffort}\"`,
        '-C',
        host,
        item.prompt,
      ], { env: { ...process.env, CODEX_HOME: authoringHome }, capture: true })
      const events = output.split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line))
      const text = events
        .filter((event) => event.type === 'item.completed' && event.item?.type === 'agent_message')
        .map((event) => event.item.text ?? '')
        .join('\n')
      const activated = activationEvidence(text, item.skill)
      const pass = activated === item.should_activate
      receipts.push({ ...item, activated, pass, model: matrix.evaluation.model, reasoningEffort: matrix.evaluation.reasoningEffort })
      console.log(`${pass ? 'PASS' : 'FAIL'} ${item.id}`)
    }
    const path = join(resultRoot, `${entry.name}.json`)
    writeFileSync(path, `${JSON.stringify(receipts, null, 2)}\n`)
    if (receipts.some((item) => !item.pass)) fail(`${entry.name}: behavioral eval failures; see ${relative(repoRoot, path)}`)
  }
}

function jsonCommand(arguments_, env) {
  const output = run(arguments_, { env, capture: true })
  try {
    return JSON.parse(output || '{}')
  } catch (error) {
    fail(`${arguments_.join(' ')} returned invalid JSON: ${error.message}`)
  }
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function inventory(root) {
  const map = new Map()
  for (const path of walk(root)) {
    const rel = relative(root, path)
    if (rel.includes(`${sep}__pycache__${sep}`) || rel.includes(`${sep}node_modules${sep}`)) continue
    const stat = lstatSync(path)
    map.set(rel, stat.isSymbolicLink() ? `link:${readlinkSync(path)}` : sha256(path))
  }
  return map
}

function compareInventory(sourceRoot, installedRoot, name) {
  const source = inventory(sourceRoot)
  const installed = inventory(installedRoot)
  const differences = []
  for (const [path, digest] of source) {
    if (installed.get(path) !== digest) differences.push(`${path}: source and installed copy differ`)
  }
  for (const path of installed.keys()) if (!source.has(path)) differences.push(`${path}: unexpected installed file`)
  if (differences.length) {
    for (const difference of differences) console.error(`ERROR ${name}: ${difference}`)
    fail(`${name}: installed inventory mismatch`)
  }
}

async function hookTrust(env, pluginId) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(codexBin(), ['app-server', '--stdio'], { env, stdio: ['pipe', 'pipe', 'pipe'] })
    const lines = readline.createInterface({ input: child.stdout })
    const timer = setTimeout(() => {
      child.kill()
      rejectPromise(new Error('hook trust query timed out'))
    }, 20000)
    lines.on('line', (line) => {
      let payload
      try { payload = JSON.parse(line) } catch { return }
      if (payload.id === 1) {
        child.stdin.write(`${JSON.stringify({ method: 'initialized', params: {} })}\n`)
        child.stdin.write(`${JSON.stringify({ method: 'hooks/list', id: 2, params: {} })}\n`)
      }
      if (payload.id === 2) {
        clearTimeout(timer)
        const hooks = (payload.result?.data ?? []).flatMap((workspace) => workspace.hooks ?? [])
          .filter((hook) => hook.pluginId === pluginId)
        child.kill()
        resolvePromise(hooks)
      }
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      rejectPromise(error)
    })
    child.stdin.write(`${JSON.stringify({ method: 'initialize', id: 1, params: { clientInfo: { name: 'opl-plugin-dev', version: '1' } } })}\n`)
  })
}

function configuredMarketplace(payload, name) {
  return (payload.marketplaces ?? []).some((item) => item.name === name)
}

function receiptPath(targetHome, entry) {
  return join(targetHome, 'opl-plugin-dev-receipts', `${entry.name}.json`)
}

function writeInstallReceipt(targetHome, entry, installed) {
  const path = receiptPath(targetHome, entry)
  mkdirSync(resolve(path, '..'), { recursive: true })
  writeFileSync(path, `${JSON.stringify({
    pluginId: installed.pluginId,
    installedPath: installed.installedPath,
  }, null, 2)}\n`)
}

function installedFromReceipt(entry, targetHome) {
  const path = receiptPath(targetHome, entry)
  if (!existsSync(path)) fail(`${entry.name}: no installed-checkpoint receipt exists; run without --resume-after-trust first`)
  const receipt = readJson(path)
  const env = { ...process.env, CODEX_HOME: targetHome }
  const expectedId = `${entry.name}@${marketplace.name}`
  const listed = jsonCommand([codexBin(), 'plugin', 'list', '--json'], env)
  if (!(listed.installed ?? []).some((item) => item.pluginId === expectedId)) {
    fail(`${entry.name}: the receipt exists but the plugin is no longer installed`)
  }
  if (receipt.pluginId !== expectedId || typeof receipt.installedPath !== 'string' || !existsSync(receipt.installedPath)) {
    fail(`${entry.name}: installed-checkpoint receipt is stale or invalid`)
  }
  return { env, installedPath: realpathSync(receipt.installedPath), pluginId: expectedId }
}

function installCandidate(entry, targetHome, { consumer = false } = {}) {
  const env = { ...process.env, CODEX_HOME: targetHome }
  mkdirSync(targetHome, { recursive: true })
  const listed = jsonCommand([codexBin(), 'plugin', 'list', '--json'], env)
  const installed = listed.installed ?? []
  if (!consumer) {
    const unrelated = installed.filter((item) => item.marketplaceName !== marketplace.name)
    if (unrelated.length) fail(`black-box home contains unrelated plugins: ${unrelated.map((item) => item.pluginId).join(', ')}`)
  }
  for (const item of installed) {
    if (consumer && item.pluginId !== `${entry.name}@${marketplace.name}`) continue
    jsonCommand([codexBin(), 'plugin', 'remove', item.pluginId, '--json'], env)
  }
  const sources = jsonCommand([codexBin(), 'plugin', 'marketplace', 'list', '--json'], env)
  if (configuredMarketplace(sources, marketplace.name)) {
    jsonCommand([codexBin(), 'plugin', 'marketplace', 'remove', marketplace.name, '--json'], env)
  }
  jsonCommand([codexBin(), 'plugin', 'marketplace', 'add', repoRoot, '--json'], env)
  const result = jsonCommand([codexBin(), 'plugin', 'add', `${entry.name}@${marketplace.name}`, '--json'], env)
  if (typeof result.installedPath !== 'string' || !existsSync(result.installedPath)) {
    fail(`${entry.name}: install did not return a usable installedPath`)
  }
  return { env, installedPath: realpathSync(result.installedPath), pluginId: `${entry.name}@${marketplace.name}` }
}

async function runInstalled(entries = selectedPlugins()) {
  const packageOnly = flag('package-only')
  if (entries.length !== 1) {
    if (!packageOnly) fail('test:installed requires exactly one --plugin (except --plugin all --package-only)')
    for (const entry of entries) await runInstalled([entry])
    return
  }
  const entry = entries[0]
  runContract(entries)
  if (!packageOnly) runUnit(entries)
  const blackboxHome = join(stateRoot(), 'blackbox')
  const installed = flag('resume-after-trust')
    ? installedFromReceipt(entry, blackboxHome)
    : installCandidate(entry, blackboxHome)
  if (!flag('resume-after-trust')) writeInstallReceipt(blackboxHome, entry, installed)
  compareInventory(pluginRoot(entry), installed.installedPath, entry.name)
  const manifest = manifestFor(entry)
  if (typeof manifest.hooks === 'string') {
    let hooks
    try { hooks = await hookTrust(installed.env, installed.pluginId) } catch (error) { fail(`${entry.name}: ${error.message}`) }
    if (!hooks.length) fail(`${entry.name}: installed plugin declared hooks but app-server discovered none`)
    const pending = hooks.filter((hook) => hook.trustStatus !== 'trusted')
    if (!packageOnly && pending.length) {
      console.error(`Hook trust is not complete for ${installed.pluginId}.`)
      console.error(`Run: CODEX_HOME=${blackboxHome} ${codexBin()} --no-alt-screen -C ${repoRoot}`)
      console.error('Open /hooks, review this plugin, trust it, then reply done.')
      console.error('After confirmation, rerun this checkpoint with --resume-after-trust.')
      fail('installed hook smoke paused for trust review', 78)
    }
  }
  console.log(`${entry.name}: clean installed-copy checkpoint passed at ${installed.installedPath}${packageOnly ? ' (package/discovery only)' : ''}`)
}

function installLocal(entries = selectedPlugins(), targetHome = option('target-home')) {
  if (!targetHome) fail('install:local requires --target-home <path>; it never defaults to ~/.codex')
  const resolvedHome = resolve(targetHome)
  const env = { ...process.env, CODEX_HOME: resolvedHome }
  mkdirSync(resolvedHome, { recursive: true })
  const installed = jsonCommand([codexBin(), 'plugin', 'list', '--json'], env).installed ?? []
  for (const entry of entries) {
    const pluginId = `${entry.name}@${marketplace.name}`
    if (installed.some((item) => item.pluginId === pluginId)) {
      jsonCommand([codexBin(), 'plugin', 'remove', pluginId, '--json'], env)
    }
  }
  const sources = jsonCommand([codexBin(), 'plugin', 'marketplace', 'list', '--json'], env)
  if (!configuredMarketplace(sources, marketplace.name)) {
    jsonCommand([codexBin(), 'plugin', 'marketplace', 'add', repoRoot, '--json'], env)
  }
  for (const entry of entries) {
    const result = jsonCommand([codexBin(), 'plugin', 'add', `${entry.name}@${marketplace.name}`, '--json'], env)
    if (typeof result.installedPath !== 'string' || !existsSync(result.installedPath)) {
      fail(`${entry.name}: install did not return a usable installedPath`)
    }
    console.log(`${entry.name}: installed at ${realpathSync(result.installedPath)}`)
  }
  console.log('Installation only: no tests or skill evaluations were run. Start a new Codex session before using updated components.')
  console.log('If the selected plugins contain hooks, review them explicitly with /hooks.')
}

function runVerify() {
  const entries = selectedPlugins('all')
  runContract(entries)
  runUnit(entries)
  runMcp(entries)
  runUi(entries)
}

async function runRelease() {
  runVerify()
  for (const entry of pluginEntries()) await runInstalled([entry])
  runEval(pluginEntries())
}

const command = process.argv[2]
if (command === 'focus') runFocus()
else if (command === 'unit') runUnit()
else if (command === 'contract') runContract()
else if (command === 'mcp') runMcp()
else if (command === 'ui') runUi()
else if (command === 'eval') runEval()
else if (command === 'installed') await runInstalled()
else if (command === 'verify') runVerify()
else if (command === 'release') await runRelease()
else if (command === 'install-local') installLocal()
else fail(`unknown command: ${command ?? '(missing)'}`)
