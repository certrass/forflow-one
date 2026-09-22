// @vitest-environment happy-dom
import { useState, type ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import {
  JEV_QUESTION_VERSION,
  type JevAuditApi,
  type JevReceipt
} from '../../../../shared/jev-audit-types'
import { review, receipt as oldReceipt } from './review-workspace-fixtures'
import { deliveryBasis, deliveryReceipt } from './jev-delivery-fixtures'
import { JevAuditPanel } from './JevAuditPanel'

const receipt = { ...oldReceipt, questionVersion: JEV_QUESTION_VERSION }

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
    prepare: vi.fn(async (input) => {
      const common = {
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
      }
      return input.mode === 'delivery'
        ? { ...input, ...common, basis: deliveryBasis }
        : { ...input, ...common }
    }),
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
  fireEvent.mouseDown(screen.getByRole('tab', { name: '单条检查' }), { button: 0 })
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
  fireEvent.mouseDown(screen.getByRole('tab', { name: '单条检查' }), { button: 0 })
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

it('requires explicit delivery sources, preserves handoff subset and invalidates changed previews', async () => {
  render(
    <Panel review={review} version={review.versions[0]} readOnly={false} onUpdated={vi.fn()} />
  )
  expect(screen.getByRole('tab', { name: '交付质量' })).toHaveAttribute('data-state', 'active')
  const prepare = screen.getByRole('button', { name: '准备发送预览' })
  expect(prepare).toBeDisabled()
  const evidence = screen.getByRole('checkbox', { name: /^选择证据:/ })
  const handoff = screen.getByRole('checkbox', { name: /^作为交接说明:/ })
  expect(handoff).toBeDisabled()
  fireEvent.click(evidence)
  fireEvent.click(handoff)
  fireEvent.click(prepare)
  await screen.findByRole('button', { name: '将此预览发送至 Jev' })
  expect(api.prepare).toHaveBeenCalledWith({
    mode: 'delivery',
    reviewId: review.id,
    versionId: review.versions[0].id,
    evidenceKeys: ['evidence'],
    handoffEvidenceKeys: ['evidence']
  })
  expect(api.run).not.toHaveBeenCalled()
  fireEvent.click(evidence)
  expect(handoff).not.toBeChecked()
  expect(handoff).toBeDisabled()
  expect(screen.queryByRole('button', { name: '将此预览发送至 Jev' })).toBeNull()
  fireEvent.click(evidence)
  fireEvent.click(prepare)
  await screen.findByRole('button', { name: '将此预览发送至 Jev' })
  expect(api.prepare).toHaveBeenLastCalledWith(expect.objectContaining({ handoffEvidenceKeys: [] }))
  fireEvent.mouseDown(screen.getByRole('tab', { name: '单条检查' }), { button: 0 })
  expect(screen.queryByRole('button', { name: '将此预览发送至 Jev' })).toBeNull()
})

it('keeps mixed delivery results manual and never turns Noul or Score into issue thresholds', async () => {
  api.run = vi.fn(async () => deliveryReceipt)
  render(
    <Panel review={review} version={review.versions[0]} readOnly={false} onUpdated={vi.fn()} />
  )
  fireEvent.click(screen.getByRole('checkbox', { name: /^选择证据:/ }))
  fireEvent.click(screen.getByRole('button', { name: '准备发送预览' }))
  fireEvent.click(await screen.findByRole('button', { name: '将此预览发送至 Jev' }))
  expect(await screen.findByText('待人工复核 · 不代表验收通过')).toBeVisible()
  expect(screen.getByText('是的概率: 90.0%')).toBeVisible()
  expect(screen.getByText(/1.81 \/ 4/)).toBeVisible()
  const accepts = screen.getAllByRole('button', { name: '加入 Issues' })
  expect(accepts).toHaveLength(1)
  fireEvent.click(accepts[0])
  await waitFor(() =>
    expect(api.accept).toHaveBeenCalledWith({
      receiptId: deliveryReceipt.id,
      question: 'criterion_evidence',
      expectedRevision: review.revision
    })
  )
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

it('caps an explicitly selected delivery packet at twelve sources and never reuses a preview for another version', async () => {
  const version = {
    ...review.versions[0],
    audit: {
      ...review.versions[0].audit,
      rows: Array.from({ length: 13 }, (_, index) => ({
        ...review.versions[0].audit.rows[0],
        evidenceKey: `source-${index}`,
        recordId: `record-${index}`
      }))
    }
  }
  const view = render(
    <Panel review={review} version={version} readOnly={false} onUpdated={vi.fn()} />
  )
  const choices = screen.getAllByRole('checkbox', { name: /^选择证据:/ })
  for (const choice of choices.slice(0, 12)) {
    fireEvent.click(choice)
  }
  expect(choices[12]).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '准备发送预览' }))
  await screen.findByRole('button', { name: '将此预览发送至 Jev' })
  expect(api.prepare).toHaveBeenCalledWith(
    expect.objectContaining({
      evidenceKeys: Array.from({ length: 12 }, (_, index) => `source-${index}`)
    })
  )
  view.rerender(
    <Panel
      review={review}
      version={{ ...version, id: 'new-version' }}
      readOnly={false}
      onUpdated={vi.fn()}
    />
  )
  expect(screen.queryByRole('button', { name: '将此预览发送至 Jev' })).toBeNull()
  expect(api.run).not.toHaveBeenCalled()
})
