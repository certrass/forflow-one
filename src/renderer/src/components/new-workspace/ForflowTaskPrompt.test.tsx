// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ForflowTaskPrompt } from './ForflowTaskPrompt'

vi.mock('@/i18n/i18n', () => ({ translate: (_key: string, fallback: string) => fallback }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({}) }))
afterEach(cleanup)

it('fills an empty draft with a reviewable example without submitting it', () => {
  const onChange = vi.fn()
  const view = render(<ForflowTaskPrompt value="" onChange={onChange} creating={false} />)
  fireEvent.click(screen.getByText('Not sure what to write? Start with an example'))
  fireEvent.click(screen.getByRole('button', { name: 'Understand this project' }))
  expect(onChange).toHaveBeenCalledOnce()
  expect(onChange.mock.calls[0][0]).toContain('Do not modify files yet.')
  view.rerender(
    <ForflowTaskPrompt value={onChange.mock.calls[0][0]} onChange={onChange} creating={false} />
  )
  expect(screen.getByRole('textbox', { name: 'What do you want to accomplish?' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Make a small change' }).hasAttribute('disabled')).toBe(
    true
  )
})

it('does not overwrite imported task material or change an in-flight draft', () => {
  const onChange = vi.fn()
  const view = render(
    <ForflowTaskPrompt
      value="Imported Feishu task with source"
      onChange={onChange}
      creating={false}
    />
  )
  fireEvent.click(screen.getByText('Not sure what to write? Start with an example'))
  fireEvent.click(screen.getByRole('button', { name: 'Review existing work' }))
  expect(onChange).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox').getAttribute('aria-describedby')).toBeTruthy()
  view.rerender(<ForflowTaskPrompt value="" onChange={onChange} creating />)
  expect(screen.getByRole('textbox').hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Understand this project' }))
  expect(onChange).not.toHaveBeenCalled()
})

it.each(['Make another version', 'Compare outputs'])(
  'offers %s directly and preserves an existing draft',
  (label) => {
    const onChange = vi.fn()
    const view = render(<ForflowTaskPrompt value="" onChange={onChange} creating={false} />)
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(onChange).toHaveBeenCalledOnce()
    view.rerender(<ForflowTaskPrompt value="my task" onChange={onChange} creating={false} />)
    expect(screen.queryByRole('button', { name: label })).toBeNull()
    expect(onChange).toHaveBeenCalledOnce()
    view.rerender(<ForflowTaskPrompt value="" onChange={onChange} creating />)
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(onChange).toHaveBeenCalledOnce()
  }
)
