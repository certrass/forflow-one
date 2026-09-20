// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppState } from '../../store/types'
import { UsageEvidencePanel } from './UsageEvidencePanel'

const { store } = vi.hoisted(() => {
  const store: Partial<AppState> = {}
  return { store }
})
vi.mock('../../store', () => ({
  useAppStore: (selector: (state: Partial<AppState>) => unknown) => selector(store)
}))
afterEach(cleanup)
beforeEach(() => {
  Object.keys(store).forEach((key) => Reflect.deleteProperty(store, key))
})

describe('usage evidence panel', () => {
  it('shows all four cost bases and audit dimensions without inventing settlement or percentages', () => {
    render(<UsageEvidencePanel selection="overview" />)
    for (const name of [
      '估算',
      '已结算',
      '套餐分摊',
      '不可计量',
      '上下文',
      '模型调用',
      '工具调用',
      '数据读取'
    ]) {
      expect(screen.getByText(name, { exact: true })).toBeVisible()
    }
    expect(screen.getByText('未接入账单')).toBeVisible()
    expect(screen.getByText('未配置分摊')).toBeVisible()
    expect(screen.getByText('尚无法判断')).toBeVisible()
    expect(screen.getByText('暂无可核验记录')).toBeVisible()
    expect(screen.getByText('现有证据：当前来源或范围尚无可核验的模型用量记录。')).toBeVisible()
    expect(screen.queryByText(/100%|\$0/)).not.toBeInTheDocument()
  })
  it('shows Grok quota limitation after changing selection', () => {
    const view = render(<UsageEvidencePanel selection="codex" />)
    expect(screen.getByLabelText('用量证据来源')).toHaveTextContent('Codex')
    view.rerender(<UsageEvidencePanel selection="grok" />)
    expect(screen.queryByLabelText('用量证据来源')).not.toBeInTheDocument()
    expect(screen.getByText(/Grok 当前仅提供套餐额度/)).toBeVisible()
  })
})
