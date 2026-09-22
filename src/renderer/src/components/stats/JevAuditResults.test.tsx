// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import { JEV_QUESTION_VERSION } from '../../../../shared/jev-audit-types'
import { review, receipt } from './review-workspace-fixtures'
import { deliveryReceipt } from './jev-delivery-fixtures'
import { JevAuditResults } from './JevAuditResults'
import { JevRequestPreview } from './JevRequestPreview'

beforeEach(async () => {
  await i18n.changeLanguage('zh')
})
afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('en')
})

it('shows historical legacy and delivery replies without allowing obsolete questions or evaluators to be adopted', () => {
  const onAccept = vi.fn()
  render(
    <JevAuditResults
      review={review}
      busy={false}
      readOnly={false}
      onAccept={onAccept}
      receipts={[
        receipt,
        {
          ...deliveryReceipt,
          id: 'old-evaluator',
          basis: { ...deliveryReceipt.basis!, evaluatorVersion: 'old' }
        }
      ]}
    />
  )
  expect(screen.getAllByText('历史问题或审计器版本 · 请重新检查后采纳')).toHaveLength(2)
  expect(screen.getAllByRole('button', { name: '加入 Issues' })).toHaveLength(2)
  for (const button of screen.getAllByRole('button', { name: '加入 Issues' })) {
    expect(button).toBeDisabled()
    fireEvent.click(button)
  }
  expect(onAccept).not.toHaveBeenCalled()
})

it('locates every source and leaves even current delivery results read-only in historical review', () => {
  const onLocate = vi.fn()
  render(
    <JevAuditResults
      review={review}
      busy={false}
      readOnly
      onAccept={vi.fn()}
      onLocate={onLocate}
      receipts={[{ ...deliveryReceipt, evidenceKeys: ['evidence', 'linked-source'] }]}
    />
  )
  const buttons = screen.getAllByRole('button', { name: /^定位关联记录/ })
  expect(buttons).toHaveLength(2)
  fireEvent.click(buttons[1])
  expect(onLocate).toHaveBeenCalledWith('linked-source')
  expect(screen.getByRole('button', { name: '加入 Issues' })).toBeDisabled()
  expect(screen.getByText(/1.81 \/ 4/)).toBeVisible()
  expect(screen.getByText(/按返回概率重算: 1.70/)).toBeVisible()
})

it('keeps current legacy choice adoption compatible', () => {
  const onAccept = vi.fn()
  render(
    <JevAuditResults
      review={review}
      busy={false}
      readOnly={false}
      onAccept={onAccept}
      receipts={[{ ...receipt, questionVersion: JEV_QUESTION_VERSION }]}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: '加入 Issues' }))
  expect(onAccept).toHaveBeenCalledWith(receipt.id, 'evidence')
})

it('renders the exact delivery criterion and each source role without inventing explanations', () => {
  const body = JSON.stringify({
    model: 'jev-1.13.0',
    state: {
      targetCriterion: { text: '重启后仍可读取' },
      sources: [
        {
          id: 'S1',
          role: 'assistant_claim',
          text: '只完成保存，尚未重启。',
          truncated: false,
          omitted: false
        },
        {
          id: 'S2',
          role: 'execution_result',
          text: '重启返回不可读。',
          truncated: true,
          omitted: false
        }
      ],
      handoff: { sourceIds: ['S1'] },
      coverage: { partial: true }
    }
  })
  render(<JevRequestPreview body={body} />)
  expect(screen.getByText('本次检查要求 · 重启后仍可读取')).toBeVisible()
  expect(screen.getByText('S1 · 助手主张')).toBeVisible()
  expect(screen.getByText('S2 · 执行返回')).toBeVisible()
  expect(screen.getByText('只完成保存，尚未重启。', { exact: true })).toBeVisible()
  expect(screen.getByText('作为交接说明')).toBeVisible()
})
