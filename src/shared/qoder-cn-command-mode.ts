import { optionName } from './print-mode-headless-command'

// Qoder CN's positional query is non-interactive, unlike CodeBuddy's query.
const VALUE_OPTIONS = new Set([
  '--prompt-interactive',
  '-i',
  '--config-dir',
  '--model',
  '-m',
  '--session-id',
  '--name',
  '-n',
  '--max-turns',
  '--max-output-tokens',
  '--permission-mode',
  '--input-format',
  '--mcp-config',
  '--max-model-request-retries',
  '--agent',
  '--agents',
  '--system-prompt',
  '--append-system-prompt',
  '--settings',
  '--plugin-dir',
  '--remote-session',
  '--teleport'
])
const NON_INTERACTIVE_OPTIONS = new Set([
  '--print',
  '-p',
  '--acp',
  '--remote',
  '--remote-control',
  '--list-models',
  '--list-sessions',
  '--delete-session',
  '--help',
  '-h',
  '--version',
  '-v'
])

export function isQoderCnNonInteractiveCommand(tokens: readonly string[]): boolean {
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token === '--') {
      return index + 1 < tokens.length
    }
    const name = optionName(token)
    if (NON_INTERACTIVE_OPTIONS.has(name)) {
      return true
    }
    if (name === '--output-format' || name === '-o') {
      const value = token.includes('=') ? token.slice(token.indexOf('=') + 1) : tokens[++index]
      if (value === 'json' || value === 'stream-json') {
        return true
      }
      continue
    }
    if (VALUE_OPTIONS.has(name)) {
      if (name === token) {
        index += 1
      }
      continue
    }
    if (name === '--resume' || name === '-r') {
      if (name === token && tokens[index + 1] && !tokens[index + 1].startsWith('-')) {
        index += 1
      }
      continue
    }
    if (!token.startsWith('-')) {
      return true
    }
  }
  return false
}
