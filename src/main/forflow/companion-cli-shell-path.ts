import { dirname } from 'node:path'
import { isForflowBuild } from '../../shared/product-branding'

/** Login profiles can put a different installed Forflow ahead of this bundle. */
export function getCompanionCliPathRestore(): string {
  return isForflowBuild()
    ? 'if [ -n "${FORFLOW_CLI_BIN_DIR:-}" ]; then export PATH="${FORFLOW_CLI_BIN_DIR}:$PATH"; fi\n'
    : ''
}

export function setCompanionCliShellPath(
  env: Record<string, string>,
  launcher: string | null,
  isWsl: boolean | undefined
): void {
  delete env.FORFLOW_CLI_BIN_DIR
  if (isForflowBuild() && !isWsl && launcher && process.platform !== 'win32') {
    env.FORFLOW_CLI_BIN_DIR = dirname(launcher)
  }
}
