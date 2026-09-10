#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { codexCommand } from './codex-command.mjs'
import { ensurePluginHookTrust } from './codex-hooks.mjs'

const marketplaceFiles = [
  '.agents/plugins/marketplace.json',
  '.agents/plugins/api_marketplace.json',
  '.claude-plugin/marketplace.json',
  '.cursor-plugin/marketplace.json',
]

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/u, ''))
  } catch (error) {
    throw new Error(`Cannot read JSON at ${path}: ${error.message}`, { cause: error })
  }
}

function within(root, candidate) {
  const path = relative(root, candidate)
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path))
}

function validName(name) {
  return typeof name === 'string' && /^[a-z0-9][a-z0-9._-]*$/iu.test(name)
}

function canonicalDestination(path) {
  const absolute = resolve(path)
  if (existsSync(absolute)) return realpathSync(absolute)
  if (dirname(absolute) === absolute) throw new Error(`Cannot resolve the destination filesystem root: ${absolute}`)
  return join(canonicalDestination(dirname(absolute)), basename(absolute))
}

function installationPlan({ repo = process.cwd(), plugins, targetHome }) {
  if (!Array.isArray(plugins) || !plugins.length) throw new Error('--plugin NAME is required; use --plugin all only for the entire marketplace')
  if (!targetHome || !isAbsolute(targetHome)) throw new Error('--target-home requires an explicit absolute Codex home path; it never defaults to ~/.codex')
  if (plugins.includes('all') && plugins.length !== 1) throw new Error('--plugin all must be used alone')
  const root = realpathSync(repo)
  const home = canonicalDestination(targetHome)
  const cache = canonicalDestination(join(home, 'plugins', 'cache'))
  const manifestPath = marketplaceFiles.map((path) => join(root, path)).find(existsSync)
  if (!manifestPath) throw new Error(`No local marketplace manifest found in ${root}; expected ${marketplaceFiles.join(', ')}`)
  const marketplace = readJson(manifestPath)
  if (!validName(marketplace.name) || !Array.isArray(marketplace.plugins) || !marketplace.plugins.length) {
    throw new Error(`Invalid marketplace name or plugins array in ${manifestPath}`)
  }
  const entries = new Map()
  for (const entry of marketplace.plugins) {
    if (!validName(entry?.name) || entries.has(entry.name)) throw new Error(`Invalid or duplicate plugin name in ${manifestPath}: ${entry?.name}`)
    entries.set(entry.name, entry)
  }
  const names = plugins[0] === 'all' ? [...entries.keys()] : [...new Set(plugins)]
  const selected = names.map((name) => {
    const entry = entries.get(name)
    if (!entry) throw new Error(`Unknown plugin ${name}; available: ${[...entries.keys()].join(', ')}`)
    const path = typeof entry.source === 'string' ? entry.source : entry.source?.source === 'local' ? entry.source.path : undefined
    if (typeof path !== 'string' || !path || isAbsolute(path)) throw new Error(`${name}: refresh requires a relative local plugin source`)
    const cursor = manifestPath === join(root, '.cursor-plugin', 'marketplace.json')
    if ((!cursor && path !== '.' && !path.startsWith('./')) || path.split(/[\\/]/u).includes('..')) {
      throw new Error(`${name}: local source path must stay beneath the marketplace root and use ./ (optional for Cursor): ${path}`)
    }
    const source = realpathSync(resolve(root, path))
    if (!within(root, source)) throw new Error(`${name}: plugin source escapes marketplace root: ${source}`)
    if (!statSync(source).isDirectory()) throw new Error(`${name}: plugin source is not a directory: ${source}`)
    if (within(source, home)) throw new Error(`${name}: the Codex home must not be inside the plugin source: ${home}`)
    if (within(cache, source) || within(source, cache)) throw new Error(`${name}: target cache must not overlap the plugin source: ${cache}`)
    return { name, pluginId: `${name}@${marketplace.name}`, source }
  })
  return { root, home, marketplace: marketplace.name, plugins: selected }
}

function codexJson(args, { root, home }, environment) {
  const env = { ...environment, CODEX_HOME: home }
  const [command, ...commandArgs] = codexCommand(args, { env })
  const result = spawnSync(command, commandArgs, { cwd: root, env, encoding: 'utf8', windowsHide: true })
  if (result.error) throw new Error(`Codex ${args.join(' ')} could not run: ${result.error.message}`, { cause: result.error })
  if (result.status !== 0) throw new Error(`Codex ${args.join(' ')} failed (${result.status ?? result.signal}): ${result.stderr.trim() || result.stdout.trim()}`)
  if (result.stderr.trim()) process.stderr.write(result.stderr)
  try {
    return JSON.parse(result.stdout)
  } catch (error) {
    throw new Error(`Codex ${args.join(' ')} returned invalid JSON: ${error.message}`, { cause: error })
  }
}

export async function installLocal(options) {
  const plan = installationPlan(options)
  if (options.dryRun) {
    console.log(JSON.stringify({ ...plan, dryRun: true }, null, 2))
    return plan
  }
  const env = options.env ?? process.env
  mkdirSync(plan.home, { recursive: true })
  const listed = codexJson(['plugin', 'marketplace', 'list', '--json'], plan, env)
  if (!Array.isArray(listed?.marketplaces)) throw new Error('Codex marketplace list did not return a marketplaces array')
  const registered = listed.marketplaces.find((item) => item.name === plan.marketplace)
  if (registered) {
    if (typeof registered.root !== 'string' || !existsSync(registered.root) || realpathSync(registered.root) !== plan.root) {
      throw new Error(`Marketplace ${plan.marketplace} is registered at ${registered.root ?? '(unknown root)'}, not ${plan.root}. Resolve that registration or choose a separate --target-home before refreshing.`)
    }
  } else {
    codexJson(['plugin', 'marketplace', 'add', plan.root, '--json'], plan, env)
  }
  // Codex stages fresh local bytes and atomically replaces even same-version installs.
  // All modules are already loaded; OPL can replace the cache containing this script.
  for (const plugin of plan.plugins) {
    const result = codexJson(['plugin', 'add', plugin.pluginId, '--json'], plan, env)
    if (typeof result?.installedPath !== 'string' || !existsSync(result.installedPath)) {
      throw new Error(`${plugin.name}: Codex install did not return a usable installedPath`)
    }
    plugin.installedPath = realpathSync(result.installedPath)
    console.log(`${plugin.name}: installed and enabled at ${plugin.installedPath}`)
    const manifest = ['.codex-plugin/plugin.json', '.claude-plugin/plugin.json', '.cursor-plugin/plugin.json']
      .map((path) => join(plugin.installedPath, path)).find(existsSync)
    const required = existsSync(join(plugin.installedPath, 'hooks', 'hooks.json')) || Boolean(manifest && readJson(manifest).hooks)
    const hooks = await ensurePluginHookTrust({
      repo: plan.root, home: plan.home, pluginId: plugin.pluginId,
      installedPath: plugin.installedPath, required, env,
    })
    if (hooks.length) console.log(`${plugin.name}: verified trust for ${hooks.length} installed hook(s).`)
  }
  console.log('Installation only: no tests or skill evaluations were run. Start a new Codex session before using updated components.')
  return plan
}

export async function runInstallLocal(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    repo: { type: 'string' },
    plugin: { type: 'string', multiple: true },
    'target-home': { type: 'string' },
    'dry-run': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  } })
  if (values.help) {
    console.log('Usage: node install-local.mjs [--repo DIR] --plugin NAME [--plugin NAME ...] --target-home ABSOLUTE_PATH [--dry-run]')
    console.log('Use --plugin all explicitly for every plugin. --repo defaults to the working directory.')
    console.log('Authorized installs also trust and verify the selected plugins\' current hooks through Codex, without interactive onboarding.')
    console.log('--dry-run validates local sources and prints the plan without invoking Codex or changing files; registrations are checked on installation.')
    console.log('Requires Node.js 22+ and Codex with plugin commands (verified with 0.151.0). CODEX_BIN can select a native executable or JS entrypoint.')
    return
  }
  return installLocal({ repo: values.repo, plugins: values.plugin, targetHome: values['target-home'], dryRun: values['dry-run'] })
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await runInstallLocal() } catch (error) {
    console.error(`install-local: ${error.message}`)
    process.exitCode = 1
  }
}
