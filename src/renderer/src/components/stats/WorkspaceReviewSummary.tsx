import { SettingsSectionStack } from '../settings/SettingsSectionStack'
import type { WorkspaceReviewSnapshot } from '../../../../shared/workspace-review-types'
import { Badge } from '../ui/badge'
import { workspaceReviewCopy } from './workspace-review-copy'

export function WorkspaceReviewSummary({
  snapshot
}: {
  snapshot: WorkspaceReviewSnapshot
}): React.JSX.Element {
  const c = workspaceReviewCopy()
  const signals = snapshot.files.flatMap((file) => file.signals.map((signal) => ({ file, signal })))
  const categories = {
    credential: c.credential,
    personal_data: c.personalData,
    confidential_marker: c.confidentialMarker
  }
  const applicability = {
    unconfirmed: c.unconfirmed,
    applies: c.applies,
    not_applicable: c.notApplicable
  }
  return (
    <section className="space-y-5" data-testid="workspace-review-summary">
      <SettingsSectionStack
        spacing="section"
        sections={[
          <section key="source" className="space-y-3">
            <h4 className="text-base font-medium">{c.sourceCoverage}</h4>
            <p className="break-all text-sm">
              {snapshot.target.name} · {snapshot.target.rootPath}
            </p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              {[
                [
                  c.files,
                  `${snapshot.files.filter((file) => file.status === 'read').length}/${snapshot.files.length}`
                ],
                [c.sessions, snapshot.selection.sessionIds.length],
                [c.branch, snapshot.git.branch ?? c.unknown],
                [c.head, snapshot.git.head ?? c.unknown]
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="break-all text-right">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted-foreground">{c.gitNote}</p>
            <p className="text-xs text-muted-foreground">{c.readOnlyNote}</p>
            {snapshot.git.reason && (
              <p className="text-xs text-muted-foreground">{snapshot.git.reason}</p>
            )}
            {snapshot.gaps.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium">{c.gaps}</h5>
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {snapshot.gaps.map((gap, index) => (
                    <li key={`${index}:${gap}`}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
            {snapshot.git.changes.length > 0 && (
              <details className="space-y-2">
                <summary className="cursor-pointer text-xs">
                  {c.gitChanges} · {snapshot.git.changes.length}
                </summary>
                <ul className="max-h-64 space-y-1 overflow-auto scrollbar-sleek font-mono text-xs text-muted-foreground">
                  {snapshot.git.changes.map((change) => (
                    <li key={`${change.status}:${change.path}`} className="break-all">
                      {change.status} · {change.path}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>,
          <section key="policy" className="space-y-3">
            <h4 className="text-base font-medium">{c.policy}</h4>
            <Badge variant="outline">
              {c.applicability} · {applicability[snapshot.selection.applicability]}
            </Badge>
            <p className="whitespace-pre-wrap break-words text-sm">
              {snapshot.selection.policyReference || c.emptyPolicy}
            </p>
            {snapshot.selection.applicabilityReason && (
              <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                {snapshot.selection.applicabilityReason}
              </p>
            )}
          </section>,
          <section key="signals" className="space-y-3">
            <h4 className="text-base font-medium">
              {c.signals} · {signals.length}
            </h4>
            <p className="text-xs text-muted-foreground">{c.signalNote}</p>
            {signals.length === 0 && <p className="text-sm">{c.noSignals}</p>}
            <ul className="max-h-80 space-y-3 overflow-auto scrollbar-sleek">
              {signals.map(({ file, signal }) => (
                <li key={signal.id} className="space-y-1 text-sm">
                  <p>{categories[signal.category]}</p>
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {file.path}:{signal.line}:{signal.column}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.flowUnknown} · {c.authorizationUnknown}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {c.ruleVersion} · {snapshot.ruleVersion}
            </p>
          </section>
        ]}
      />
    </section>
  )
}
