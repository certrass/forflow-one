import { assertClipboardImageByteLengthWithinLimit } from '../../shared/clipboard-image'
import { callRuntimeEnvironment } from '../ipc/runtime-environment-transport-routing'
import { confirmForflowRuntimeTransfer } from '../forflow/transfer-approval'

type ClipboardUploadFence = {
  expectedEnvironmentPairingRevision?: number
  expectedEnvironmentRuntimeId?: string
}

const CLIPBOARD_IMAGE_UPLOAD_CHUNK_BASE64_CHARS = 512 * 1024
const CLIPBOARD_IMAGE_SINGLE_FRAME_FALLBACK_BASE64_CHARS = 256 * 1024
const CLIPBOARD_IMAGE_SAVE_TIMEOUT_MS = 30_000

async function callRuntimeClipboardMethod<TResult>(
  userDataPath: string,
  runtimeEnvironmentId: string,
  method: string,
  params: unknown,
  fence: ClipboardUploadFence
): Promise<TResult> {
  const response = await callRuntimeEnvironment(
    userDataPath,
    runtimeEnvironmentId,
    method,
    params,
    CLIPBOARD_IMAGE_SAVE_TIMEOUT_MS,
    fence.expectedEnvironmentPairingRevision,
    undefined,
    { expectedEnvironmentRuntimeId: fence.expectedEnvironmentRuntimeId }
  )
  if (!response.ok) {
    throw new Error(response.error.message)
  }
  return response.result as TResult
}

async function saveClipboardImageBase64InRuntime(
  userDataPath: string,
  runtimeEnvironmentId: string,
  contentBase64: string,
  connectionId: string | null
): Promise<string> {
  const fence = await confirmForflowRuntimeTransfer(
    userDataPath,
    runtimeEnvironmentId,
    `将上传剪贴板图片；编码后 ${contentBase64.length} 字符。${connectionId ? `\n运行环境内的 SSH 目标：${JSON.stringify(connectionId)}` : ''}`
  )
  runtimeEnvironmentId = fence.environmentId
  const startResponse = await callRuntimeEnvironment(
    userDataPath,
    runtimeEnvironmentId,
    'clipboard.startImageUpload',
    { expectedBase64Length: contentBase64.length, connectionId },
    CLIPBOARD_IMAGE_SAVE_TIMEOUT_MS,
    fence.expectedEnvironmentPairingRevision,
    undefined,
    { expectedEnvironmentRuntimeId: fence.expectedEnvironmentRuntimeId }
  )
  if (!startResponse.ok) {
    if (
      startResponse.error.code === 'method_not_found' &&
      contentBase64.length <= CLIPBOARD_IMAGE_SINGLE_FRAME_FALLBACK_BASE64_CHARS
    ) {
      return callRuntimeClipboardMethod<string>(
        userDataPath,
        runtimeEnvironmentId,
        'clipboard.saveImageAsTempFile',
        { contentBase64, connectionId },
        fence
      )
    }
    throw new Error(startResponse.error.message)
  }
  const result = startResponse.result
  if (
    !result ||
    typeof result !== 'object' ||
    typeof (result as { uploadId?: unknown }).uploadId !== 'string'
  ) {
    throw new Error('Remote clipboard image upload returned an invalid id')
  }
  const { uploadId } = result as { uploadId: string }
  try {
    for (
      let offset = 0;
      offset < contentBase64.length;
      offset += CLIPBOARD_IMAGE_UPLOAD_CHUNK_BASE64_CHARS
    ) {
      await callRuntimeClipboardMethod(
        userDataPath,
        runtimeEnvironmentId,
        'clipboard.appendImageUploadChunk',
        {
          uploadId,
          offset,
          contentBase64: contentBase64.slice(
            offset,
            offset + CLIPBOARD_IMAGE_UPLOAD_CHUNK_BASE64_CHARS
          )
        },
        fence
      )
    }
    const remotePath = await callRuntimeClipboardMethod<string>(
      userDataPath,
      runtimeEnvironmentId,
      'clipboard.commitImageUpload',
      { uploadId },
      fence
    )
    if (typeof remotePath !== 'string') {
      throw new Error('Remote clipboard image save returned an invalid path')
    }
    return remotePath
  } catch (error) {
    // Why: failed chunked pastes should release the remote upload slot
    // immediately instead of waiting for TTL cleanup.
    await callRuntimeClipboardMethod(
      userDataPath,
      runtimeEnvironmentId,
      'clipboard.abortImageUpload',
      {
        uploadId
      },
      fence
    ).catch(() => {})
    throw error
  }
}

// connectionId: the runtime-side SSH target that holds the workspace, or null for
// the runtime host itself. The runtime resolves it in its own provider registry.
export function saveClipboardImageBufferInRuntime(
  userDataPath: string,
  runtimeEnvironmentId: string,
  buffer: Buffer,
  connectionId: string | null = null
): Promise<string> {
  assertClipboardImageByteLengthWithinLimit(buffer.byteLength)
  return saveClipboardImageBase64InRuntime(
    userDataPath,
    runtimeEnvironmentId,
    buffer.toString('base64'),
    connectionId
  )
}
