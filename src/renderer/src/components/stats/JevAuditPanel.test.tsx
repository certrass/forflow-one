// @vitest-environment happy-dom
import { useState, type ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import type { JevAuditApi, JevReceipt } from '../../../../shared/jev-audit-types'
import { review, receipt } from './review-workspace-fixtures'
import { JevAuditPanel } from './JevAuditPanel'

function Panel(props: Omit<ComponentProps<typeof JevAuditPanel>, 'receipts' | 'onReceipt'>) {
  const [receipts, setReceipts] = useState<JevReceipt[]>([])
  return (
    <JevAuditPanel {...props} receipts={receipts} onReceipt={(value) => setReceipts([value])} />
  )
}
const originalApi = window.api
let api: JevAuditApi
beforeEach(async () => {
  await i18n.changeLanguage('zh')
  api = {
    list: vi.fn(async () => []),
    prepare: vi.fn(async (input) => ({
      ...input,
      id: receipt.id,
      inputHash: receipt.inputHash,
      expiresAt: Date.now() + 600_000,
      body: JSON.stringify({
        model: 'jev-1.13.0',
        state: {
          focus: 'Did it complete?',
          claim: '',
          record: 'only selected fixture',
          result: null,
          partial: false
        }
      })
    })),
    run: vi.fn(async () => receipt),
    accept: vi.fn(async () => ({ ...review, revision: 1 }))
  }
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      forflowJevAudit: api,
      forflowModelAccounts: {
        list: async () => [{ provider: 'jev', model: null, state: 'missing' }]
      }
    }
  })
})
afterEach(async () => {
  cleanup()
  Object.defineProperty(window, 'api', { configurable: true, value: originalApi })
  await i18n.changeLanguage('en')
})

it('requires a distinct send action and lets a human promote a suggestion into the current review', async () => {
  const onUpdated = vi.fn()
  render(
    <Panel review={review} version={review.versions[0]} readOnly={false} onUpdated={onUpdated} />
  )
  fireEvent.click(screen.getByRole('button', { name: '准备发送预览' }))
  const send = await screen.findByRole('button', { name: '将此预览发送至 Jev' })
  expect(screen.getByText(/Typesafe 云端 API/)).toBeTruthy()
  expect(screen.getByText('only selected fixture', { exact: true })).toBeVisible()
  expect(api.run).not.toHaveBeenCalled()
  fireEvent.click(send)
  const accept = await screen.findByRole('button', { name: '加入 Issues' })
  expect(api.run).toHaveBeenCalledExactlyOnceWith({ id: receipt.id, inputHash: receipt.inputHash })
  expect(api.accept).not.toHaveBeenCalled()
  fireEvent.click(accept)
  await waitFor(() => expect(onUpdated).toHaveBeenCalledOnce())
  expect(api.accept).toHaveBeenCalledWith({
    receiptId: receipt.id,
    question: 'evidence',
    expectedRevision: 0
  })
})

it('invalidates the preview when the claim changes and keeps historical versions read-only', async () => {
  const view = render(
    <Panel review={review} version={review.versions[0]} readOnly={false} onUpdated={vi.fn()} />
  )
  fireEvent.click(screen.getByRole('button', { name: '准备发送预览' }))
  await screen.findByRole('button', { name: '将此预览发送至 Jev' })
  fireEvent.change(screen.getByLabelText('待核实的主张（可选）'), {
    target: { value: 'changed claim' }
  })
  expect(screen.queryByRole('button', { name: '将此预览发送至 Jev' })).toBeNull()
  view.rerender(<Panel review={review} version={review.versions[0]} readOnly onUpdated={vi.fn()} />)
  expect(screen.queryByRole('button', { name: '准备发送预览' })).toBeNull()
  expect(api.run).not.toHaveBeenCalled()
})

it('prepares the record selected from the log and keeps the parent locked until the check returns', async () => {
  let finish: ((value: JevReceipt) => void) | undefined
  api.run = vi.fn(
    () =>
      new Promise<JevReceipt>((resolve) => {
        finish = resolve
      })
  )
  const onBusyChange = vi.fn()
  const version = {
    ...review.versions[0],
    audit: {
      ...review.versions[0].audit,
      rows: [
        ...review.versions[0].audit.rows,
        { ...review.versions[0].audit.rows[0], evidenceKey: 'second', recordId: 'second-call' }
      ]
    }
  }
  render(
    <Panel
      review={review}
      version={version}
      readOnly={false}
      initialEvidenceKey="second"
      onUpdated={vi.fn()}
      onBusyChange={onBusyChange}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: '准备发送预览' }))
  const send = await screen.findByRole('button', { name: '将此预览发送至 Jev' })
  expect(api.prepare).toHaveBeenCalledWith(expect.objectContaining({ evidenceKey: 'second' }))
  fireEvent.click(send)
  expect(send).toBeDisabled()
  expect(onBusyChange).toHaveBeenLastCalledWith(true)
  fireEvent.click(send)
  expect(api.run).toHaveBeenCalledOnce()
  finish?.({ ...receipt, evidenceKey: 'second' })
  await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false))
})
