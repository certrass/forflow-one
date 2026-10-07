// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import type {
  ForflowWorkBuddyAccountApi,
  WorkBuddyAccountStatus
} from '../../../../shared/forflow-workbuddy-account'
import { WorkBuddyAccountsSection } from './WorkBuddyAccountsSection'
import { getAccountsPaneSearchEntries } from './accounts-search'
import { matchesSettingsSearch } from './settings-search'

const originalApi = window.api
let api: ForflowWorkBuddyAccountApi
const account: WorkBuddyAccountStatus = {
  state: 'signed-in',
  name: '小流',
  userId: 'account-demo',
  accountType: 'personal',
  organization: null
}
beforeEach(async () => {
  await i18n.changeLanguage('zh')
  vi.stubGlobal('FORFLOW_BRAND_ENABLED', true)
  api = { getStatus: vi.fn(async () => account) }
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { forflowWorkBuddyAccount: api }
  })
})
afterEach(async () => {
  cleanup()
  vi.unstubAllGlobals()
  Object.defineProperty(window, 'api', { configurable: true, value: originalApi })
  await i18n.changeLanguage('en')
})

describe('WorkBuddy accounts', () => {
  it('shows the identity and refreshes after switching accounts', async () => {
    render(<WorkBuddyAccountsSection localHost />)
    expect(await screen.findByText('小流')).toBeVisible()
    expect(screen.getByText('已登录')).toBeVisible()
    expect(screen.getByText('个人账户')).toBeVisible()
    expect(screen.getByText('账号 ID：account-demo')).toBeVisible()
    expect(screen.queryByText(/积分/)).toBeNull()
    vi.mocked(api.getStatus).mockResolvedValueOnce({
      ...account,
      name: '项目组',
      accountType: 'enterprise',
      organization: '示例团队'
    })
    fireEvent.click(screen.getByRole('button', { name: '刷新账号' }))
    expect(await screen.findByText('项目组')).toBeVisible()
    expect(screen.getByText('示例团队')).toBeVisible()
    expect(screen.queryByText('小流')).toBeNull()
  })
  it.each([
    ['not-installed', '尚未安装 WorkBuddy'],
    ['signed-out', '尚未登录'],
    ['unavailable', '账号读取失败']
  ] as const)('explains %s with the next action', async (state, message) => {
    vi.mocked(api.getStatus).mockResolvedValue({ state })
    render(<WorkBuddyAccountsSection localHost />)
    expect(await screen.findByText(new RegExp(message))).toBeVisible()
    expect(screen.queryByText('已登录')).toBeNull()
  })
  it('clears a stale identity on failure and retries without echoing vendor errors', async () => {
    render(<WorkBuddyAccountsSection localHost />)
    await screen.findByText('小流')
    vi.mocked(api.getStatus).mockRejectedValueOnce(new Error('secret-token /private/account'))
    fireEvent.click(screen.getByRole('button', { name: '刷新账号' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('账号读取失败')
    expect(screen.queryByText(/secret-token/)).toBeNull()
    expect(screen.queryByText('小流')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(await screen.findByText('小流')).toBeVisible()
  })
  it('hides local identity immediately on remote/WSL switch, including late results', async () => {
    let resolveRead: (value: WorkBuddyAccountStatus) => void = () => {}
    vi.mocked(api.getStatus).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRead = resolve
      })
    )
    const view = render(<WorkBuddyAccountsSection localHost />)
    expect(screen.getByRole('button', { name: '刷新账号' })).toBeDisabled()
    view.rerender(<WorkBuddyAccountsSection localHost={false} />)
    resolveRead(account)
    expect(await screen.findByText(/切换到本机/)).toBeVisible()
    expect(screen.queryByText('小流')).toBeNull()
    view.rerender(<WorkBuddyAccountsSection localHost />)
    expect(await screen.findByText('小流')).toBeVisible()
    expect(api.getStatus).toHaveBeenCalledTimes(2)
  })
  it('does not fetch for remote/WSL accounts', () => {
    render(<WorkBuddyAccountsSection localHost={false} />)
    expect(api.getStatus).not.toHaveBeenCalled()
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('explains older clients and exposes the account through settings search', () => {
    Object.defineProperty(window, 'api', { configurable: true, value: {} })
    render(<WorkBuddyAccountsSection localHost />)
    expect(screen.getByText(/更新 Forflow One/)).toBeVisible()
    expect(matchesSettingsSearch('WorkBuddy', getAccountsPaneSearchEntries())).toBe(true)
  })
})
