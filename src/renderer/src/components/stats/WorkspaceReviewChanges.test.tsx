// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { i18n } from '@/i18n/i18n'
import type { CodexReviewVersion } from '../../../../shared/codex-review-types'
import { review } from './review-workspace-fixtures'
import { WorkspaceReviewChanges } from './WorkspaceReviewChanges'

beforeEach(async () => {
  await i18n.changeLanguage('zh')
})
afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('en')
})

function version(): CodexReviewVersion {
  return {
    ...review.versions[0],
    usage: null,
    workspace: {
      target: {
        id: 'workspace',
        selector: 'folder:one',
        kind: 'folder',
        hostId: 'local',
        name: 'Fixture',
        rootPath: '/fixture',
        projectId: null,
        available: true,
        unavailableReason: null
      },
      rootIdentity: 'fixture-root',
      selection: {
        files: [{ path: 'README.md', kind: 'document' }],
        sessionIds: ['session-before'],
        policyReference: '制度 2025',
        applicability: 'applies',
        applicabilityReason: '旧适用依据'
      },
      files: [
        {
          path: 'README.md',
          kind: 'document',
          evidenceKey: 'file',
          status: 'read',
          contentHash: 'hash',
          size: 1,
          mtimeMs: 1,
          reason: null,
          signals: []
        }
      ],
      git: { status: 'not_applicable', head: null, branch: null, changes: [], reason: null },
      ruleVersion: 'workspace-evidence-v1',
      partial: true,
      gaps: []
    }
  }
}

it('shows changed review inputs even when all selected file contents are unchanged', () => {
  const previous = version()
  const current = version()
  if (!current.workspace) {
    throw new Error('Missing fixture workspace')
  }
  current.workspace.selection = {
    ...current.workspace.selection,
    sessionIds: ['session-after'],
    policyReference: '制度 2026',
    applicability: 'not_applicable',
    applicabilityReason: '新例外依据'
  }
  render(<WorkspaceReviewChanges previous={previous} current={current} />)
  for (const value of ['session-before', '制度 2025', '旧适用依据', '适用']) {
    expect(screen.getByText(value, { exact: true })).toBeVisible()
  }
  for (const value of ['session-after', '制度 2026', '新例外依据', '不适用']) {
    expect(screen.getByText(`→ ${value}`, { exact: true })).toBeVisible()
  }
  expect(screen.getByText('已观察到相同内容 · 1')).toBeVisible()
})

it('compares linked conversation records in workspace versions', () => {
  const previous = version()
  const current = version()
  current.audit = {
    ...current.audit,
    rows: [{ ...current.audit.rows[0], evidenceKey: 'new-evidence', recordId: 'new-call' }]
  }
  render(<WorkspaceReviewChanges previous={previous} current={current} />)
  expect(screen.getByText('exec · call')).toBeVisible()
  expect(screen.getByText('exec · new-call')).toBeVisible()
  expect(screen.queryByText('区间 Token')).toBeNull()
})

it('does not report session order alone as a changed selection', () => {
  const previous = version()
  const current = version()
  if (!previous.workspace || !current.workspace) {
    throw new Error('Missing fixture workspace')
  }
  previous.workspace.selection.sessionIds = ['one', 'two']
  current.workspace.selection.sessionIds = ['two', 'one']
  render(<WorkspaceReviewChanges previous={previous} current={current} />)
  expect(screen.queryByText(/→ (one|two)/)).toBeNull()
})

it('shows Git-only changes outside the selected files and a changed read result', () => {
  const previous = version()
  const current = version()
  if (!previous.workspace || !current.workspace) {
    throw new Error('Missing fixture workspace')
  }
  previous.workspace.git = {
    status: 'ready',
    head: 'same-head',
    branch: 'main',
    reason: null,
    changes: [{ status: 'M', path: 'unselected.ts' }]
  }
  current.workspace.git = {
    status: 'unavailable',
    head: 'same-head',
    branch: 'work',
    reason: 'Git status unavailable',
    changes: []
  }
  render(<WorkspaceReviewChanges previous={previous} current={current} />)
  expect(screen.getByText('main', { exact: true })).toBeVisible()
  expect(screen.getByText('→ work', { exact: true })).toBeVisible()
  expect(screen.getByText('M · unselected.ts', { exact: true })).toBeVisible()
  expect(screen.getByText(/→ .*Git status unavailable/s)).toBeVisible()
  expect(screen.getByText('已观察到相同内容 · 1')).toBeVisible()
  expect(screen.getByText(/Git 状态用于定位变更路径/)).toBeVisible()
})

it('shows a change in Git failure reason even when the read status is unchanged', () => {
  const previous = version()
  const current = version()
  if (!previous.workspace || !current.workspace) {
    throw new Error('Missing fixture workspace')
  }
  previous.workspace.git = { ...previous.workspace.git, status: 'unavailable', reason: 'timeout' }
  current.workspace.git = {
    ...current.workspace.git,
    status: 'unavailable',
    reason: 'permission denied'
  }
  render(<WorkspaceReviewChanges previous={previous} current={current} />)
  expect(screen.getByText(/timeout/)).toBeVisible()
  expect(screen.getByText(/→ .*permission denied/s)).toBeVisible()
})
