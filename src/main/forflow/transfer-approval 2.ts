import { z } from 'zod'
import { isForflowPrivateDeployment } from './deployment-policy'
import { assertForflowRequestAllowed } from './network-request-policy'
import { resolveEnvironment } from '../../shared/runtime-environment-store'
import { getPreferredPairingOffer } from '../../shared/runtime-environments'
import type { KnownRuntimeEnvironment } from '../../shared/runtime-environments'
import { runtimeEnvironmentRevisionFailure } from '../ipc/runtime-environment-revision-guard'
import { getSshConnectionGeneration } from '../ssh/ssh-connection-generation'
import { formatByteCeiling } from '../ipc/runtime-import-limits'

const pathsSchema = z
  .array(
    z
      .string()
      .min(1)
      .max(4096)
      .refine((value) => !value.includes('\0'))
  )
  .min(1)
  .max(256)

function runtimeDestinationFingerprint(environment: KnownRuntimeEnvironment): string {
  return JSON.stringify({
    id: environment.id,
    revision: environment.pairingRevision ?? environment.createdAt,
    runtimeId: environment.runtimeId,
    preferred: environment.preferredEndpointId,
    endpoints: environment.endpoints
  })
}

export function describeForflowTransfer(paths: readonly string[], bytes?: number): string {
  const checked = pathsSchema.parse(paths)
  const names = checked
    .slice(0, 8)
    .map((value) => JSON.stringify(value))
    .join('\n')
  const remaining = checked.length > 8 ? `\n另有 ${checked.length - 8} 个路径。` : ''
  const size =
    bytes === undefined
      ? ''
      : `\n数据大小：${formatByteCeiling(z.number().int().nonnegative().parse(bytes))}`
  return `将传输以下文件或目录：\n${names}${remaining}${size}`
}

export async function requireForflowTransferApproval(
  destination: string,
  description: string,
  signal?: AbortSignal
): Promise<void> {
  if (!isForflowPrivateDeployment()) {
    return
  }
  const { requestForflowApproval, FORFLOW_UPLOAD_CANCELLED } = await import('./approval-broker')
  if (!(await requestForflowApproval({ kind: 'upload', destination, description }, signal))) {
    throw new Error(FORFLOW_UPLOAD_CANCELLED)
  }
}

export async function confirmForflowSshTransfer(
  connectionId: string,
  description: string,
  destinationPath: string
): Promise<() => void> {
  if (!isForflowPrivateDeployment()) {
    return () => {}
  }
  const { getSshConnectionManager } = await import('../ipc/ssh')
  const connection = getSshConnectionManager()?.getConnection(connectionId)
  if (!connection || connection.getState().status !== 'connected') {
    throw new Error('SSH 连接不可用，无法确认上传目标。')
  }
  const target = connection.getTarget()
  const fingerprint = JSON.stringify(target)
  const generation = getSshConnectionGeneration(connectionId)
  const validate = (): void => {
    if (
      getSshConnectionManager()?.getConnection(connectionId) !== connection ||
      connection.getState().status !== 'connected' ||
      getSshConnectionGeneration(connectionId) !== generation ||
      JSON.stringify(connection.getTarget()) !== fingerprint
    ) {
      throw new Error('上传目标已变化，请重新发起并确认。')
    }
  }
  assertForflowRequestAllowed(`https://${target.host}`)
  await requireForflowTransferApproval(
    `SSH 目标：${JSON.stringify(`${target.username}@${target.host}:${target.port}`)}\n保存到：${JSON.stringify(destinationPath)}`,
    description
  )
  validate()
  return validate
}

export async function confirmForflowRuntimeTransfer(
  userDataPath: string,
  environmentId: string,
  description: string,
  expectation: {
    expectedEnvironmentPairingRevision?: number
    expectedEnvironmentRuntimeId?: string
  } = {},
  signal?: AbortSignal
): Promise<typeof expectation & { environmentId: string }> {
  if (!isForflowPrivateDeployment()) {
    return { environmentId, ...expectation }
  }
  const environment = resolveEnvironment(userDataPath, environmentId)
  const failure = runtimeEnvironmentRevisionFailure(
    environment,
    expectation.expectedEnvironmentPairingRevision,
    'file.upload',
    expectation.expectedEnvironmentRuntimeId
  )
  if (failure && !failure.ok) {
    throw new Error(failure.error.message)
  }
  const endpoint = getPreferredPairingOffer(environment).endpoint
  assertForflowRequestAllowed(endpoint)
  const destination = new URL(endpoint).origin
  await requireForflowTransferApproval(
    `远程运行环境：${JSON.stringify(environment.name)}\n地址：${destination}`,
    description,
    signal
  )
  if (
    runtimeDestinationFingerprint(resolveEnvironment(userDataPath, environment.id)) !==
    runtimeDestinationFingerprint(environment)
  ) {
    throw new Error('上传目标已变化，请重新发起并确认。')
  }
  return {
    environmentId: environment.id,
    expectedEnvironmentPairingRevision: environment.pairingRevision ?? environment.createdAt,
    ...(environment.runtimeId ? { expectedEnvironmentRuntimeId: environment.runtimeId } : {})
  }
}
