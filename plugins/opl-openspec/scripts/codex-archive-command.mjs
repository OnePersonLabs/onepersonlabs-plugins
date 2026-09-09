#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

function splitSegments(command, powershell = false) {
  const segments = []
  let current = ''
  let quote = null
  let escaped = false

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index]
    if (escaped) {
      current += character
      escaped = false
      continue
    }
    if (character === (powershell ? '`' : '\\') && quote !== "'") {
      current += character
      escaped = true
      continue
    }
    if (quote) {
      current += character
      if (character === quote) quote = null
      continue
    }
    if (character === "'" || character === '"') {
      quote = character
      current += character
      continue
    }
    const pair = command.slice(index, index + 2)
    if (
      character === ';' ||
      character === '|' ||
      character === '\n' ||
      character === '\r' ||
      pair === '&&' ||
      pair === '||'
    ) {
      if (current.trim()) segments.push(current.trim())
      current = ''
      if (pair === '&&' || pair === '||') index += 1
      continue
    }
    current += character
  }
  if (current.trim()) segments.push(current.trim())
  return segments
}

function words(segment, powershell = false) {
  const result = []
  let current = ''
  let quote = null
  let escaped = false
  let started = false

  const finish = () => {
    if (started) result.push(current)
    current = ''
    started = false
  }

  for (let index = 0; index < segment.length; index += 1) {
    const character = segment[index]
    if (escaped) {
      current += character
      started = true
      escaped = false
      continue
    }
    if (character === (powershell ? '`' : '\\') && quote !== "'") {
      escaped = true
      started = true
      continue
    }
    if (quote) {
      if (powershell && quote === "'" && character === "'" && segment[index + 1] === "'") {
        current += "'"
        index += 1
        continue
      }
      if (character === quote) quote = null
      else current += character
      started = true
      continue
    }
    if (character === "'" || character === '"') {
      quote = character
      started = true
    } else if (/\s/u.test(character)) finish()
    else {
      current += character
      started = true
    }
  }
  if (escaped) current += '\\'
  finish()
  return result
}

function commandStart(tokens) {
  let index = 0
  if (tokens[index] === 'rtk') {
    index += 1
    if (tokens[index] === 'proxy') index += 1
  }
  if (tokens[index] === '&') index += 1
  if (tokens[index] === 'command') {
    index += 1
    while (tokens[index]?.startsWith('-')) index += 1
  }
  return index
}

function executableName(executable) {
  return executable.replaceAll('\\', '/').split('/').at(-1).replace(/\.exe$/iu, '')
}

function operands(tokens, powershell = false) {
  let index = commandStart(tokens)
  const executable = tokens[index]
  if (!executable) return null
  const basename = executableName(executable)
  if ((powershell || basename !== 'mv') && ['move-item', 'mi', 'move', 'mv'].includes(basename.toLowerCase())) {
    let source
    let destination
    const positional = []
    for (let offset = index + 1; offset < tokens.length; offset += 1) {
      const token = tokens[offset].toLowerCase()
      if (token === '-literalpath' || token === '-path') source = tokens[++offset]
      else if (token === '-destination') destination = tokens[++offset]
      else if (['-erroraction', '-warningaction', '-informationaction', '-errorvariable', '-outvariable'].includes(token)) offset += 1
      else if (token.startsWith('-')) continue
      else positional.push(tokens[offset])
    }
    source ??= positional.shift()
    destination ??= positional.shift()
    return source && destination ? [source, destination] : null
  }
  if (basename === 'git' && tokens[index + 1] === 'mv') {
    index += 2
  } else if (basename === 'mv') {
    index += 1
  } else return null

  while (tokens[index]?.startsWith('-')) index += 1
  return tokens.slice(index)
}

function archiveFromTokens(tokens, powershell, depth) {
  const index = commandStart(tokens)
  const executable = tokens[index]
  if (!executable) return null
  if (['powershell', 'pwsh'].includes(executableName(executable).toLowerCase())) {
    const commandIndex = tokens.findIndex((token, offset) => offset > index && ['-command', '-c', '-commandwithargs'].includes(token.toLowerCase()))
    if (commandIndex < 0 || depth >= 8) return null
    const body = tokens.slice(commandIndex + 1)
    if (body.length === 1) return archiveChangeFromCommand(body[0], depth + 1)
    return archiveFromTokens(body, true, depth + 1)
  }
  const values = operands(tokens, powershell)
  if (!values || values.length < 2) return null
  const source = values[0].replaceAll('\\', '/').replace(/\/$/u, '')
  const destination = values[1].replaceAll('\\', '/').replace(/\/$/u, '')
  const match = /(?:^|\/)openspec\/changes\/([a-z][a-z0-9-]*)$/u.exec(source)
  return match && /(?:^|\/)openspec\/changes\/archive(?:\/|$)/u.test(destination) ? match[1] : null
}

export function archiveChangeFromCommand(command, depth = 0) {
  const powershell = /\b(?:Move-Item|LiteralPath)\b|\bopenspec\\changes\\|(?:^|\s)["']?(?:[A-Za-z]:\\|\.\\openspec\\)/iu.test(command)
  for (const segment of splitSegments(command, powershell)) {
    const change = archiveFromTokens(words(segment, powershell), powershell, depth)
    if (change) return change
  }
  return null
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const change = archiveChangeFromCommand(process.argv[2] ?? '')
  if (change) process.stdout.write(`${change}\n`)
  else process.exitCode = 3
}
