import { translate } from '@/i18n/i18n'
import type {
  ExternalAutomationManager,
  ExternalAutomationProvider
} from '../../../../shared/automations-types'
import type { SshConnectionStatus } from '../../../../shared/ssh-types'
import { isConnectingSshStatus } from '@/ssh/ssh-connection-recoverability'

export function isSshConnectionBusy(status: SshConnectionStatus | undefined): boolean {
  return isConnectingSshStatus(status)
}

export function getExternalAutomationActionDisabledMessage(args: {
  manager: ExternalAutomationManager
  providerLabel?: string
  targetKindLabel?: string
  sshStatus?: SshConnectionStatus
  actionInProgress?: boolean
}): string | null {
  if (args.actionInProgress) {
    return translate(
      'forflow.desktopCopy.00c187e415',
      'Another automation action is still running.'
    )
  }
  if (args.manager.canManage) {
    return null
  }
  const providerLabel = args.providerLabel ?? getProviderLabel(args.manager.provider)
  const targetKindLabel =
    args.targetKindLabel ?? (args.manager.target.type === 'ssh' ? 'SSH host' : 'Local')
  if (args.manager.target.type === 'ssh') {
    if (isSshConnectionBusy(args.sshStatus)) {
      return translate(
        'forflow.dynamicCopy.5220436923',
        'Wait for this {{value0}} to finish connecting.',
        { value0: targetKindLabel.toLowerCase() }
      )
    }
    if (args.manager.error && !isSshDisconnectedError(args.manager.error)) {
      return args.manager.error
    }
    if (args.sshStatus !== 'connected') {
      return translate(
        'forflow.dynamicCopy.496449872d',
        'Connect this {{value0}} before managing {{value1}} automations.',
        { value0: targetKindLabel.toLowerCase(), value1: providerLabel }
      )
    }
    return (
      args.manager.error ??
      `${providerLabel} cannot manage automations on this ${targetKindLabel.toLowerCase()}.`
    )
  }
  return (
    args.manager.error ??
    `${providerLabel} cannot manage automations on this ${targetKindLabel.toLowerCase()}.`
  )
}

function getProviderLabel(provider: ExternalAutomationProvider): string {
  return provider === 'hermes' ? 'Hermes' : 'OpenClaw'
}

function isSshDisconnectedError(message: string): boolean {
  return /ssh target is not connected/i.test(message)
}
