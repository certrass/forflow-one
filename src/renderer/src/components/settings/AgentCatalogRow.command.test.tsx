// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import { AgentCatalogRow, type AgentCatalogRowProps } from './AgentCatalogRow'

function props(overrides: Partial<AgentCatalogRowProps> = {}): AgentCatalogRowProps {
  return {
    agentId: 'codebuddy',
    label: 'CodeBuddy',
    homepageUrl: 'https://www.codebuddy.cn/cli',
    defaultCmd: 'codebuddy',
    defaultArgs: '',
    defaultEnv: {},
    isDetected: false,
    isEnabled: true,
    isDefault: false,
    cmdOverride: undefined,
    argsOverride: '',
    envOverride: {},
    onSetDefault: vi.fn(),
    onSetEnabled: vi.fn(),
    onSaveOverride: vi.fn(),
    onSaveArgs: vi.fn(),
    onSaveEnv: vi.fn(),
    ...overrides
  }
}

beforeEach(async () => {
  await i18n.changeLanguage('zh')
})
afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('en')
})

describe('custom command configuration before detection', () => {
  it('saves an undetected CLI path, exposes empty environment settings, and waits for detection to allow default selection', () => {
    const row = props()
    const view = render(<AgentCatalogRow {...row} />)
    fireEvent.click(screen.getByRole('button', { name: /展开/ }))
    expect(screen.queryByRole('button', { name: /设为默认/ })).toBeNull()
    expect(screen.getByText(/路径包含空格时请加引号/)).toBeTruthy()
    expect(screen.getByPlaceholderText('无默认环境')).toBeTruthy()
    const command = screen.getByPlaceholderText('codebuddy')
    command.focus()
    fireEvent.change(command, { target: { value: '"/opt/国产 工具/codebuddy"' } })
    fireEvent.keyDown(command, { key: 'Enter' })
    expect(row.onSaveOverride).toHaveBeenCalledExactlyOnceWith('"/opt/国产 工具/codebuddy"')
    view.rerender(<AgentCatalogRow {...row} isDetected cmdOverride='"/opt/国产 工具/codebuddy"' />)
    fireEvent.click(screen.getByRole('button', { name: /设为默认/ }))
    expect(row.onSetDefault).toHaveBeenCalledOnce()
  })

  it('Escape discards the command draft and blur does not save it', () => {
    const row = props({ cmdOverride: '/opt/codebuddy' })
    render(<AgentCatalogRow {...row} />)
    const command = screen.getByPlaceholderText('codebuddy')
    command.focus()
    fireEvent.change(command, { target: { value: '/missing/codebuddy' } })
    fireEvent.keyDown(command, { key: 'Escape' })
    expect(row.onSaveOverride).not.toHaveBeenCalled()
    expect(command).toHaveProperty('value', '/opt/codebuddy')
  })

  it('does not configure an undetected remote agent or select a default during refresh', () => {
    const row = props({ canConfigureCommand: false })
    const view = render(<AgentCatalogRow {...row} />)
    expect(screen.queryByRole('button', { name: /展开/ })).toBeNull()
    view.rerender(<AgentCatalogRow {...row} isDetected canSetDefault={false} />)
    const button = screen.getByRole('button', { name: /设为默认/ })
    expect(button).toHaveProperty('disabled', true)
    fireEvent.click(button)
    expect(row.onSetDefault).not.toHaveBeenCalled()
  })
})
