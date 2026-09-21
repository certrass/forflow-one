import { brandCliDocumentation, cliCommandName, isForflowCli } from './cli-product'
import { cliSpecPresentation, formatForflowRootHelp } from './forflow-help'
import type { CommandSpec } from './args'
import { findCommandSpec, isCommandGroup, matches, supportsBrowserPageFlag } from './args'
import { unknownCommandData } from './command-suggestion'
import { formatCommandFlagHelp } from './command-flag-help'
export { formatFlagHelp } from './command-flag-help'
import { ROOT_HELP_TEXT_PRIMARY } from './root-help-text-primary'
import { ROOT_HELP_TEXT_SECONDARY } from './root-help-text-secondary'

const ROOT_HELP_TEXT = [ROOT_HELP_TEXT_PRIMARY, ROOT_HELP_TEXT_SECONDARY].join('\n')

export function printHelp(specs: CommandSpec[], commandPath: string[] = []): void {
  const exactSpec = findCommandSpec(specs, commandPath)
  if (exactSpec) {
    console.log(formatCommandHelp(exactSpec))
    return
  }

  if (isCommandGroup(specs, commandPath)) {
    console.log(formatGroupHelp(specs, commandPath))
    return
  }

  if (commandPath.length > 0) {
    const { nextSteps } = unknownCommandData(specs, commandPath)
    const recovery = nextSteps
      .map((step) => `${isForflowCli() ? '下一步：' : 'Next step:'} ${step}`)
      .join('\n')
    console.log(
      `${isForflowCli() ? '未知命令：' : 'Unknown command:'} ${commandPath.join(' ')}${recovery ? `\n${recovery}` : ''}\n`
    )
  }

  console.log(isForflowCli() ? formatForflowRootHelp(specs) : ROOT_HELP_TEXT)
}

export function formatCommandHelp(input: CommandSpec): string {
  const spec = cliSpecPresentation(input)
  const lines = [
    `${cliCommandName()} ${spec.path.join(' ')}`,
    '',
    `${isForflowCli() ? '用法：' : 'Usage:'} ${spec.usage}`,
    '',
    spec.summary
  ]
  const displayedFlags =
    spec.argumentMode === 'passthrough'
      ? []
      : supportsBrowserPageFlag(spec.path)
        ? [...spec.allowedFlags, 'page']
        : spec.allowedFlags

  if (displayedFlags.length > 0) {
    lines.push('', isForflowCli() ? '选项：' : 'Options:')
    for (const flag of displayedFlags) {
      lines.push(`  ${brandCliDocumentation(formatCommandFlagHelp(flag, spec.path))}`)
    }
  }

  if (spec.notes && spec.notes.length > 0) {
    lines.push('', isForflowCli() ? '说明：' : 'Notes:')
    for (const note of spec.notes) {
      lines.push(`  ${note}`)
    }
  }

  if (spec.examples && spec.examples.length > 0) {
    lines.push('', isForflowCli() ? '示例：' : 'Examples:')
    for (const example of spec.examples) {
      lines.push(`  $ ${example}`)
    }
  }

  return lines.join('\n')
}

export function formatGroupHelp(specs: CommandSpec[], groupPath: string[]): string {
  const group = groupPath.join(' ')
  const lines = [
    `${cliCommandName()} ${group}`,
    '',
    `${isForflowCli() ? '用法：' : 'Usage:'} ${cliCommandName()} ${group} <command> [options]`,
    '',
    isForflowCli() ? '命令：' : 'Commands:'
  ]
  for (const spec of specs) {
    if (
      spec.hidden === true ||
      spec.path.length <= groupPath.length ||
      !matches(spec.path.slice(0, groupPath.length), groupPath)
    ) {
      continue
    }
    lines.push(
      `  ${spec.path.slice(groupPath.length).join(' ').padEnd(18)} ${cliSpecPresentation(spec).summary}`
    )
  }
  lines.push(
    '',
    isForflowCli()
      ? `执行 \`forflow ${group} <command> --help\` 查看具体用法。`
      : `Run \`orca ${group} <command> --help\` for command-specific usage.`
  )
  return lines.join('\n')
}
