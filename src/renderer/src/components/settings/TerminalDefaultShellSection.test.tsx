// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDefaultSettings } from '../../../../shared/constants'
import type { GlobalSettings } from '../../../../shared/global-settings-types'
import { TerminalDefaultShellSection } from './TerminalDefaultShellSection'

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string, args?: Record<string, unknown>) =>
    fallback.replace(/{{(\w+)}}/g, (_, key: string) => String(args?.[key]))
}))

const pathExists = vi.fn<(path: string) => Promise<boolean>>()
const save = vi.fn()

function Harness({ initial = '' }: { initial?: string }) {
  const [settings, setSettings] = useState({
    ...getDefaultSettings('/synthetic'),
    terminalDefaultShell: initial
  })
  const update = (patch: Partial<GlobalSettings>): void => {
    save(patch)
    setSettings((current) => ({ ...current, ...patch }))
  }
  return <TerminalDefaultShellSection settings={settings} updateSettings={update} />
}

beforeEach(() => {
  pathExists.mockReset().mockResolvedValue(true)
  save.mockReset()
  vi.stubGlobal('api', undefined)
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { platform: { get: () => ({ shell: '/bin/bash' }) }, shell: { pathExists } }
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('default shell editing', () => {
  it('opens an empty custom editor without changing the saved system default', () => {
    render(<Harness />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Custom shell' }))
    expect(screen.getByRole('textbox', { name: 'Custom shell executable' })).toHaveValue('')
    expect(screen.getByRole('radio', { name: 'Custom shell' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(save).not.toHaveBeenCalled()
  })

  it('keeps the editor open while clearing and replacing a saved command', () => {
    render(<Harness initial="fish" />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getByRole('textbox')).toHaveValue('')
    fireEvent.change(input, { target: { value: '  /bin/bash' } })
    expect(save).toHaveBeenLastCalledWith({ terminalDefaultShell: '/bin/bash' })
    fireEvent.click(screen.getByRole('radio', { name: 'System shell (/bin/bash)' }))
    expect(save).toHaveBeenLastCalledWith({ terminalDefaultShell: '' })
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Custom shell' }))
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('does not assume a PATH command is a local absolute path', () => {
    render(<Harness initial="fish" />)
    fireEvent.blur(screen.getByRole('textbox'))
    expect(pathExists).not.toHaveBeenCalled()
  })

  it('reports a missing path and clears the error on edit', async () => {
    pathExists.mockResolvedValue(false)
    render(<Harness initial="/missing/shell" />)
    fireEvent.blur(screen.getByRole('textbox'))
    expect(await screen.findByRole('alert')).toHaveTextContent('/missing/shell')
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '/bin/bash' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('handles a failed path check without an unhandled rejection', async () => {
    pathExists.mockRejectedValue(new Error('disconnected'))
    render(<Harness initial="/bin/bash" />)
    fireEvent.blur(screen.getByRole('textbox'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not check this shell path')
  })

  it('ignores a slow failure after the user changes the path', async () => {
    const pending = Promise.withResolvers<boolean>()
    pathExists.mockReturnValueOnce(pending.promise)
    render(<Harness initial="/old/shell" />)
    fireEvent.blur(screen.getByRole('textbox'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '/new/shell' } })
    fireEvent.blur(screen.getByRole('textbox'))
    await act(async () => pending.resolve(false))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('/new/shell')
  })

  it('ignores an earlier check of the same path after a newer check succeeds', async () => {
    const pending = Promise.withResolvers<boolean>()
    pathExists.mockReturnValueOnce(pending.promise)
    render(<Harness initial="/bin/bash" />)
    fireEvent.blur(screen.getByRole('textbox'))
    fireEvent.blur(screen.getByRole('textbox'))
    await act(async () => pending.resolve(false))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ignores a pending check after returning to system mode', async () => {
    const pending = Promise.withResolvers<boolean>()
    pathExists.mockReturnValueOnce(pending.promise)
    render(<Harness initial="/old/shell" />)
    fireEvent.blur(screen.getByRole('textbox'))
    fireEvent.click(screen.getByRole('radio', { name: 'System shell (/bin/bash)' }))
    await act(async () => pending.resolve(false))
    fireEvent.click(screen.getByRole('radio', { name: 'Custom shell' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
