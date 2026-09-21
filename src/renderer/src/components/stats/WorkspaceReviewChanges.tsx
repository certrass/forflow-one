import type { CodexReviewVersion } from '../../../../shared/codex-review-types'
import type { WorkspaceReviewFile } from '../../../../shared/workspace-review-types'
import { workspaceReviewCopy } from './workspace-review-copy'
import { reviewCopy } from './review-copy'
import { CodexReviewChanges } from './CodexReviewChanges'

function classifyFileChange(before?: WorkspaceReviewFile, after?: WorkspaceReviewFile) {
  if (!before) {
    return 'added'
  }
  if (!after) {
    return 'removed'
  }
  if (before.status !== after.status || before.kind !== after.kind) {
    return 'changed'
  }
  if (
    before.status !== 'read' ||
    after.status !== 'read' ||
    !before.contentHash ||
    !after.contentHash
  ) {
    return 'unverified'
  }
  return before.contentHash === after.contentHash ? 'unchanged' : 'changed'
}

export function WorkspaceReviewChanges({
  current,
  previous
}: {
  current: CodexReviewVersion
  previous?: CodexReviewVersion
}): React.JSX.Element {
  const c = workspaceReviewCopy()
  const r = reviewCopy()
  if (!previous?.workspace || !current.workspace) {
    return <p className="py-3 text-sm text-muted-foreground">{r.noChanges}</p>
  }
  const before = new Map(previous.workspace.files.map((file) => [file.path, file]))
  const after = new Map(current.workspace.files.map((file) => [file.path, file]))
  const applicability = {
    unconfirmed: c.unconfirmed,
    applies: c.applies,
    not_applicable: c.notApplicable
  }
  const gitStatus = { ready: c.read, unavailable: c.unreadable, not_applicable: c.notApplicable }
  const gitChanges = [
    {
      label: c.branch,
      before: previous.workspace.git.branch ?? '',
      after: current.workspace.git.branch ?? ''
    },
    {
      label: `Git · ${c.fileStatus}`,
      before: [gitStatus[previous.workspace.git.status], previous.workspace.git.reason]
        .filter(Boolean)
        .join('\n'),
      after: [gitStatus[current.workspace.git.status], current.workspace.git.reason]
        .filter(Boolean)
        .join('\n')
    },
    {
      label: c.gitChanges,
      before: previous.workspace.git.changes
        .map((change) => `${change.status} · ${change.path}`)
        .toSorted()
        .join('\n'),
      after: current.workspace.git.changes
        .map((change) => `${change.status} · ${change.path}`)
        .toSorted()
        .join('\n')
    }
  ].filter((change) => change.before !== change.after)
  const selectionChanges = [
    {
      label: c.sessions,
      before: previous.workspace.selection.sessionIds.toSorted().join('\n'),
      after: current.workspace.selection.sessionIds.toSorted().join('\n')
    },
    {
      label: c.policy,
      before: previous.workspace.selection.policyReference,
      after: current.workspace.selection.policyReference
    },
    {
      label: c.applicability,
      before: applicability[previous.workspace.selection.applicability],
      after: applicability[current.workspace.selection.applicability]
    },
    {
      label: c.applicabilityReason,
      before: previous.workspace.selection.applicabilityReason,
      after: current.workspace.selection.applicabilityReason
    }
  ].filter((change) => change.before !== change.after)
  const groups: Record<
    ReturnType<typeof classifyFileChange>,
    { label: string; paths: string[] }
  > = {
    added: { label: r.added, paths: [] },
    removed: { label: r.removed, paths: [] },
    changed: { label: r.changed, paths: [] },
    unchanged: { label: c.unchanged, paths: [] },
    unverified: { label: c.unverified, paths: [] }
  }
  for (const path of new Set([...before.keys(), ...after.keys()])) {
    groups[classifyFileChange(before.get(path), after.get(path))].paths.push(path)
  }
  return (
    <section className="space-y-4 py-3" data-testid="workspace-review-changes">
      <h4 className="text-base font-medium">{c.fileChanges}</h4>
      <p className="text-xs text-muted-foreground">{r.changesNote}</p>
      <p className="break-all font-mono text-xs text-muted-foreground">
        {c.head}: {previous.workspace.git.head ?? c.unknown} →{' '}
        {current.workspace.git.head ?? c.unknown}
      </p>
      {previous.focus !== current.focus && (
        <section className="space-y-2">
          <h5 className="text-sm font-medium">{c.focus}</h5>
          <p className="whitespace-pre-wrap text-xs text-muted-foreground">{previous.focus}</p>
          <p className="whitespace-pre-wrap text-sm">{current.focus}</p>
        </section>
      )}
      {[...gitChanges, ...selectionChanges].map((change) => (
        <section key={change.label} className="space-y-2">
          <h5 className="text-sm font-medium">{change.label}</h5>
          <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {change.before || '—'}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm">→ {change.after || '—'}</p>
        </section>
      ))}
      {gitChanges.length > 0 && <p className="text-xs text-muted-foreground">{c.gitNote}</p>}
      {Object.values(groups).map((group) => (
        <section key={group.label} className="space-y-2">
          <h5 className="text-sm font-medium">
            {group.label} · {group.paths.length}
          </h5>
          <ul className="space-y-1 text-xs">
            {group.paths.map((path) => (
              <li key={path} className="break-all font-mono text-muted-foreground">
                {path}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {(previous.audit.rows.length > 0 || current.audit.rows.length > 0) && (
        <section className="space-y-2 border-t border-border pt-3">
          <h4 className="text-base font-medium">{c.sessions}</h4>
          <CodexReviewChanges previous={previous} current={current} showFocus={false} />
        </section>
      )}
    </section>
  )
}
