// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import type {
  ForflowModelAccount,
  ForflowModelAccountsApi
} from '../../../../shared/forflow-model-accounts'
import { ForflowModelAccountsSection } from './ForflowModelAccountsSection'
import { getAccountsPaneSearchEntries } from './accounts-search'
import { matchesSettingsSearch } from './settings-search'

const originalApi = window.api
let accounts: ForflowModelAccount[]
let api: ForflowModelAccountsApi
beforeEach(async () => {
  await i18n.changeLanguage('zh')
  vi.stubGlobal('FORFLOW_BRAND_ENABLED', true)
  accounts = (['kimi', 'zhipu', 'deepseek'] as const).map((provider) => ({
    provider,
    state: 'missing',
    model: null
  }))
  api = {
    list: vi.fn(async () => accounts),
    save: vi.fn<ForflowModelAccountsApi['save']>(async (input) => ({
      provider: input.provider,
      state: 'configured',
      model: input.model
    })),
    remove: vi.fn(async () => {}),
    test: vi.fn(async () => ({
      ok: true,
      message: '模型接口已响应。',
      checkedAt: '2026-09-20T00:00:00Z'
    }))
  }
  Object.defineProperty(window, 'api', { configurable: true, value: { forflowModelAccounts: api } })
})
afterEach(async () => {
  cleanup()
  vi.unstubAllGlobals()
  Object.defineProperty(window, 'api', { configurable: true, value: originalApi })
  await i18n.changeLanguage('en')
})

describe('domestic API accounts', () => {
  it.each(['Kimi', '智谱 GLM', 'DeepSeek'])(
    'saves and explicitly tests %s without retaining the input key',
    async (label) => {
      render(<ForflowModelAccountsSection localHost />)
      const row = within(await screen.findByRole('region', { name: label }))
      const test = row.getByRole('button', { name: '测试连接' })
      expect(test).toHaveProperty('disabled', true)
      const key = row.getByLabelText('API Key')
      expect(key).toHaveProperty('type', 'password')
      fireEvent.change(row.getByLabelText('模型名称'), { target: { value: 'test-model' } })
      fireEvent.change(key, { target: { value: 'synthetic-key-do-not-log' } })
      fireEvent.click(row.getByRole('button', { name: '保存配置' }))
      await waitFor(() => expect(key).toHaveProperty('value', ''))
      expect(api.test).not.toHaveBeenCalled()
      expect(row.getByText('已保存，尚未验证连接。')).toBeTruthy()
      fireEvent.click(test)
      await waitFor(() => expect(row.getByText('模型接口已响应。')).toBeTruthy())
      expect(api.test).toHaveBeenCalledOnce()
      fireEvent.click(row.getByRole('button', { name: '移除配置' }))
      await waitFor(() => expect(row.getByText('已移除此 API 配置。')).toBeTruthy())
      expect(test).toHaveProperty('disabled', true)
    }
  )

  it('keeps the saved key when changing a model and requires saving before testing', async () => {
    accounts[0] = { provider: 'kimi', state: 'configured', model: 'old-model' }
    render(<ForflowModelAccountsSection localHost />)
    const row = within(await screen.findByRole('region', { name: 'Kimi' }))
    fireEvent.change(row.getByLabelText('模型名称'), { target: { value: 'new-model' } })
    expect(row.getByRole('button', { name: '测试连接' })).toHaveProperty('disabled', true)
    fireEvent.click(row.getByRole('button', { name: '保存配置' }))
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledExactlyOnceWith({ provider: 'kimi', model: 'new-model' })
    )
  })

  it('never reads local credentials from remote or WSL account views', () => {
    render(<ForflowModelAccountsSection localHost={false} />)
    expect(api.list).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('API Key')).toBeNull()
    expect(screen.getByText(/请切回本机/)).toBeTruthy()
  })

  it('shows load failure instead of missing accounts and supports retry', async () => {
    vi.mocked(api.list).mockRejectedValueOnce(new Error('private pathname'))
    render(<ForflowModelAccountsSection localHost />)
    expect(await screen.findByRole('alert')).toHaveTextContent('账户配置读取失败')
    expect(screen.queryByText(/private pathname/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(await screen.findByRole('region', { name: 'Kimi' })).toBeTruthy()
  })

  it('does not claim a failed API test is connected or echo a failed save secret', async () => {
    accounts[2] = { provider: 'deepseek', state: 'configured', model: 'test-model' }
    vi.mocked(api.test).mockResolvedValue({
      ok: false,
      message: 'API Key 无效。',
      checkedAt: '2026-09-20T00:00:00Z'
    })
    vi.mocked(api.save).mockRejectedValue(new Error('synthetic-key-do-not-log'))
    render(<ForflowModelAccountsSection localHost />)
    const row = within(await screen.findByRole('region', { name: 'DeepSeek' }))
    fireEvent.click(row.getByRole('button', { name: '测试连接' }))
    expect(await row.findByRole('alert')).toHaveTextContent('API Key 无效。')
    fireEvent.change(row.getByLabelText('API Key'), {
      target: { value: 'synthetic-key-do-not-log' }
    })
    fireEvent.click(row.getByRole('button', { name: '保存配置' }))
    await waitFor(() => expect(row.getByRole('alert')).toHaveTextContent('操作未完成'))
    expect(row.getByRole('alert').textContent).not.toContain('synthetic-key-do-not-log')
  })

  it.each(['kimi', '月之暗面', '智谱', 'deepseek', '深度求索'])(
    'finds this section by %s',
    (query) => {
      expect(matchesSettingsSearch(query, getAccountsPaneSearchEntries())).toBe(true)
    }
  )
})
