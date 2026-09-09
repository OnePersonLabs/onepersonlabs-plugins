import { existsSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join } from 'node:path'
import process from 'node:process'

export function pythonBin(env = process.env, platform = process.platform) {
  return env.PYTHON_BIN || (platform === 'win32' ? 'python' : 'python3')
}

export function codexCommand(args = [], { env = process.env, platform = process.platform } = {}) {
  let executable = env.CODEX_BIN || 'codex'
  if (platform === 'win32' && !isAbsolute(executable) && !/[\\/]/u.test(executable)) {
    const searchPath = env.PATH ?? env.Path ?? env.path ?? ''
    const names = extname(executable) ? [executable] : [`${executable}.exe`, `${executable}.cmd`, executable]
    executable = searchPath.split(';')
      .filter(Boolean)
      .flatMap((directory) => names.map((name) => join(directory.replace(/^"|"$/gu, ''), name)))
      .find((candidate) => existsSync(candidate)) ?? executable
  }

  if (platform === 'win32' && ['.cmd', '.bat', '.ps1', ''].includes(extname(executable).toLowerCase())) {
    const shimDirectory = dirname(executable)
    const packages = basename(shimDirectory).toLowerCase() === '.bin'
      ? dirname(shimDirectory)
      : join(shimDirectory, 'node_modules')
    const entrypoint = join(packages, '@openai', 'codex', 'bin', 'codex.js')
    if (existsSync(entrypoint)) executable = entrypoint
    else if (/\.(?:cmd|bat|ps1)$/iu.test(executable)) {
      throw new Error(`Cannot resolve the Codex npm entrypoint beside ${executable}; set CODEX_BIN to codex.exe or its .js entrypoint`)
    }
  }

  return /\.(?:c?js|mjs)$/iu.test(executable)
    ? [process.execPath, executable, ...args]
    : [executable, ...args]
}

export function trustCommand(home, cwd, options = {}) {
  const platform = options.platform ?? process.platform
  const command = codexCommand(['--no-alt-screen', '-C', cwd], options)
  if (platform === 'win32') {
    const quote = (value) => `'${value.replaceAll("'", "''")}'`
    return `$env:CODEX_HOME = ${quote(home)}; & ${command.map(quote).join(' ')}`
  }
  const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`
  return `CODEX_HOME=${quote(home)} ${command.map(quote).join(' ')}`
}
