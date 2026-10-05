// @vitest-environment happy-dom
import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import type {
  WorkspaceReviewDirectory,
  WorkspaceReviewDirectoryQuery,
  WorkspaceReviewTarget
} from '../../../../shared/workspace-review-types'
import type { WorkspaceReviewFileSelection } from './workspace-review-file-selection'
import { WorkspaceReviewFilePicker } from './WorkspaceReviewFilePicker'

const target: WorkspaceReviewTarget = {
  id: 'project-one',
  selector: 'folder:one',
  kind: 'folder',
  hostId: 'local',
  name: 'First project',
  rootPath: '/fixture/one',
  projectId: null,
  available: true,
  unavailableReason: null
}
const root: WorkspaceReviewDirectory = {
  directory: '',
  truncated: false,
  entries: [
    { path: 'src', name: 'src', kind: 'directory' },
    { path: 'README.md', name: 'README.md', kind: 'file' },
    { path: 'tests.log', name: 'tests.log', kind: 'file' }
  ]
}
const list = vi.fn<(query: WorkspaceReviewDirectoryQuery) => Promise<WorkspaceReviewDirectory>>()
const originalApi = window.api
const emptySelection: WorkspaceReviewFileSelection = []
beforeEach(async () => {
  await i18n.changeLanguage('en')
  list.mockReset().mockImplementation(async ({ directory }) =>
    directory === ''
      ? root
      : {
          directory,
          truncated: false,
          entries: [{ path: 'src/main.ts', name: 'main.ts', kind: 'file' }]
        }
  )
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      codexUsage: {
        listWorkspaceReviewFiles: (query: WorkspaceReviewDirectoryQuery) => list(query)
      }
    }
  })
})
afterEach(() => {
  cleanup()
  Object.defineProperty(window, 'api', { configurable: true, value: originalApi })
})
function Picker({ initial = emptySelection }: { initial?: WorkspaceReviewFileSelection }) {
  const [selected, onChange] = useState(initial)
  return (
    <WorkspaceReviewFilePicker
      target={target}
      selected={selected}
      disabled={false}
      onChange={onChange}
    />
  )
}

it('preserves explicit choices across directories and allows changing their purpose', async () => {
  render(<Picker />)
  fireEvent.click(await screen.findByRole('checkbox', { name: 'README.md' }))
  expect(screen.getByRole('combobox', { name: 'File purpose: README.md' })).toHaveTextContent(
    'Requirements and documents'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Open folder src' }))
  fireEvent.click(await screen.findByRole('checkbox', { name: 'src/main.ts' }))
  expect(screen.getByRole('combobox', { name: 'File purpose: src/main.ts' })).toHaveTextContent(
    'Code'
  )
  expect(screen.getByText('Selected materials · 2/40')).toBeVisible()
  fireEvent.click(screen.getByRole('combobox', { name: 'File purpose: src/main.ts' }))
  fireEvent.click(await screen.findByRole('option', { name: 'Test or build records' }))
  expect(screen.getByRole('combobox', { name: 'File purpose: src/main.ts' })).toHaveTextContent(
    'Test or build records'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Up one folder' }))
  expect(await screen.findByRole('checkbox', { name: 'README.md' })).toBeChecked()
  fireEvent.click(screen.getByRole('checkbox', { name: 'README.md' }))
  expect(screen.queryByRole('button', { name: 'Remove README.md' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Remove src/main.ts' }))
  expect(screen.getByText('Select at least one file from the list above.')).toBeVisible()
  expect(list.mock.calls.map(([query]) => query)).toEqual([
    { workspaceId: target.id, directory: '' },
    { workspaceId: target.id, directory: 'src' },
    { workspaceId: target.id, directory: '' }
  ])
})

it('filters only the current listing and does not fetch on search or infer file contents', async () => {
  render(<Picker />)
  await screen.findByRole('checkbox', { name: 'README.md' })
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'tests' } })
  expect(screen.queryByRole('checkbox', { name: 'README.md' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: 'tests.log' }))
  expect(screen.getByRole('combobox', { name: 'File purpose: tests.log' })).toHaveTextContent(
    'Test or build records'
  )
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'does-not-exist' } })
  expect(
    screen.getByText('No names match in this folder. Clear the filter or open another folder.')
  ).toBeVisible()
  expect(list).toHaveBeenCalledTimes(1)
})

it('enforces 40 files while allowing an existing choice to be removed', async () => {
  const initial: WorkspaceReviewFileSelection = Array.from({ length: 39 }, (_, index) => ({
    path: `${index}.ts`,
    kind: 'code'
  }))
  initial.push({ path: 'README.md', kind: 'document' })
  render(<Picker initial={initial} />)
  const extra = await screen.findByRole('checkbox', { name: 'tests.log' })
  expect(extra).toBeDisabled()
  expect(screen.getByRole('checkbox', { name: 'README.md' })).not.toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox', { name: 'README.md' }))
  expect(extra).not.toBeDisabled()
  fireEvent.click(extra)
  expect(screen.getByText('Selected materials · 40/40')).toBeVisible()
  expect(screen.getByRole('checkbox', { name: 'README.md' })).toBeDisabled()
})

it('discards old-project results and resets navigation immediately when projects change', async () => {
  let settleOld: ((value: WorkspaceReviewDirectory) => void) | undefined
  list.mockImplementation(async ({ workspaceId, directory }) => {
    if (workspaceId === target.id && directory === 'src') {
      return new Promise((resolve) => {
        settleOld = resolve
      })
    }
    return workspaceId === target.id ? root : { directory, truncated: false, entries: [] }
  })
  const props = { selected: [], disabled: false, onChange: vi.fn() }
  const view = render(<WorkspaceReviewFilePicker {...props} target={target} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Open folder src' }))
  await waitFor(() =>
    expect(list).toHaveBeenLastCalledWith({ workspaceId: target.id, directory: 'src' })
  )
  view.rerender(
    <WorkspaceReviewFilePicker
      {...props}
      target={{ ...target, id: 'project-two', rootPath: '/fixture/two' }}
    />
  )
  expect(screen.getByLabelText('Current folder')).toHaveTextContent('Project root')
  await screen.findByText('This folder has no selectable files or folders.')
  await act(async () => {
    settleOld?.({
      directory: 'src',
      truncated: false,
      entries: [{ path: 'src/old.ts', name: 'old.ts', kind: 'file' }]
    })
  })
  expect(screen.queryByRole('checkbox', { name: 'src/old.ts' })).not.toBeInTheDocument()
  expect(list).toHaveBeenLastCalledWith({ workspaceId: 'project-two', directory: '' })
})

it('does not expose a late error after clearing the selected project', async () => {
  let rejectOld: ((reason: Error) => void) | undefined
  list.mockImplementation(
    () =>
      new Promise((_, reject) => {
        rejectOld = reject
      })
  )
  const props = { selected: [], disabled: false, onChange: vi.fn() }
  const view = render(<WorkspaceReviewFilePicker {...props} target={target} />)
  await waitFor(() => expect(list).toHaveBeenCalledTimes(1))
  view.rerender(<WorkspaceReviewFilePicker {...props} target={undefined} />)
  await act(async () => {
    rejectOld?.(new Error('old-project error'))
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByText('Choose a project first to browse its files.')).toBeVisible()
})

it('shows access failure with retry and explains a truncated listing', async () => {
  list
    .mockRejectedValueOnce(new Error('Permission denied'))
    .mockResolvedValueOnce({ ...root, truncated: true })
  render(<Picker />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not list this folder.')
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByRole('checkbox', { name: 'README.md' })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(
    screen.getByText(
      'Only the first 500 entries are listed. The filter searches this list, not the whole project.'
    )
  ).toBeVisible()
})
