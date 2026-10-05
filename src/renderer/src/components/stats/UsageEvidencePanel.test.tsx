// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppState } from '../../store/types'
import { UsageEvidencePanel } from './UsageEvidencePanel'
import { UsageCostCard } from './UsageCostCard'

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

describe('integrated usage evidence', () => {
  it('keeps evidence collapsed, opens one dimension at a time and can close it', () => {
    render(<UsageEvidencePanel selection="overview" />)
    for (const name of ['上下文', '模型调用', '工具调用', '数据读取']) {
      expect(screen.getByRole('button', { name: `${name}审计详情` })).toHaveAttribute(
        'aria-expanded',
        'false'
      )
    }
    expect(screen.queryByText(/待补证据/)).not.toBeInTheDocument()
    const model = screen.getByRole('button', { name: '模型调用审计详情' })
    fireEvent.click(model)
    expect(model).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('现有证据：当前来源或范围尚无可核验的模型用量记录。')).toBeVisible()
    const data = screen.getByRole('button', { name: '数据读取审计详情' })
    fireEvent.click(data)
    expect(model).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText(/待补证据：文件版本/)).toBeVisible()
    fireEvent.click(data)
    expect(screen.queryByText(/待补证据/)).not.toBeInTheDocument()
    expect(screen.queryByText(/100%|\$0/)).not.toBeInTheDocument()
  })
  it('updates the open source disclosure when changing provider without reusing old evidence', () => {
    const view = render(<UsageEvidencePanel selection="codex" />)
    fireEvent.click(screen.getByRole('button', { name: '来源与范围' }))
    expect(screen.getByLabelText('用量证据来源')).toHaveTextContent('Codex · 未启用')
    view.rerender(<UsageEvidencePanel selection="grok" />)
    expect(screen.getByLabelText('用量证据来源')).not.toHaveTextContent('Codex')
    expect(screen.getByText(/Grok 当前仅提供套餐额度/)).toBeVisible()
  })
  it('shows an explicit unavailable cost in the existing statistic card', () => {
    render(<UsageCostCard selection="overview" />)
    expect(screen.getByRole('button', { name: '费用口径：估算' })).toBeVisible()
    expect(screen.getByText('暂无金额')).toBeVisible()
    expect(screen.queryByText(/\$0|n\/a/)).not.toBeInTheDocument()
  })
})
