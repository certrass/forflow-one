import type { CodexReviewVersion } from '../../../../shared/codex-review-types'
import type { WorkspaceReviewFile } from '../../../../shared/workspace-review-types'
import { workspaceReviewCopy } from './workspace-review-copy'
import { reviewCopy } from './review-copy'

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
    </section>
  )
}
