import { isPrintModeHeadlessOneShotCommand, optionName } from './print-mode-headless-command'

// ACP and the web server use their own transports, not the terminal composer.
const NON_TUI_OPTIONS = new Set(['--acp', '--serve', '--help', '-h', '--version', '-v'])

export function isCodeBuddyNonInteractiveCommand(tokens: readonly string[]): boolean {
  if (isPrintModeHeadlessOneShotCommand(tokens)) {
    return true
  }
  for (const token of tokens.slice(1)) {
    if (token === '--') {
      return false
    }
    if (NON_TUI_OPTIONS.has(optionName(token))) {
      return true
    }
  }
  return false
}
