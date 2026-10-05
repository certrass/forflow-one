import {
  ArrowLeft,
  Bot,
  Check,
  GitBranch,
  MessageSquare,
  RefreshCw,
  CircleCheck
} from 'lucide-react'
import type { CodexReview, CodexReviewVersion } from '../../../../shared/codex-review-types'
import { codexReviewStatus } from '../../../../shared/codex-review-types'
import type { JevReceipt } from '../../../../shared/jev-audit-types'
import { Button } from '../ui/button'
import { ButtonGroup } from '../ui/button-group'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { reviewCopy } from './review-copy'
import { reviewWorkspaceCopy } from './review-workspace-copy'
import { workspaceReviewCopy } from './workspace-review-copy'
import { summarizeReviewChecks } from './codex-review-activity'
import { RANGE_LABELS, SCOPE_OPTIONS } from './codex-usage-filter-options'

export function CodexReviewHeader({
  review,
  version,
  selected,
  busy,
  readOnly,
  focusChanged,
  receipts,
  onBack,
  onVersion,
  onOverview,
  onChecks,
  onReread,
  onConfirm
}: {
  review: CodexReview
  version: CodexReviewVersion
  selected: number
  busy: boolean
  readOnly: boolean
  focusChanged: boolean
  receipts: JevReceipt[]
  onBack: () => void
  onVersion: (index: number) => void
  onOverview: () => void
  onChecks: () => void
  onReread: () => void
  onConfirm: () => void
}): React.JSX.Element {
  const c = reviewCopy()
  const w = reviewWorkspaceCopy()
  const p = workspaceReviewCopy()
  const status = codexReviewStatus(review)
  const checks = summarizeReviewChecks(receipts, version.id)
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <Button variant="ghost" size="sm" disabled={busy} onClick={onBack}>
          <ArrowLeft />
          {version.workspace ? p.back : c.back}
        </Button>
        <Badge variant="outline">
          {readOnly
            ? c.historicBadge
            : status === 'confirmed'
              ? c.confirmed
              : status === 'issues'
                ? c.hasIssues
                : c.reviewing}
        </Badge>
      </div>
      <h3 className="break-words text-xl font-semibold">
        {version.workspace?.target.name ?? version.usage?.title ?? review.sessionId ?? c.unknown}
      </h3>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <GitBranch className="size-4 shrink-0 text-muted-foreground" />
          <Select
            value={String(selected)}
            disabled={busy}
            onValueChange={(value) => onVersion(Number(value))}
          >
            <SelectTrigger aria-label={c.version}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {review.versions.map((entry, index) => (
                <SelectItem key={entry.id} value={String(index)}>
                  v{index + 1} · {new Date(entry.createdAt).toLocaleString()}
                  {index === review.versions.length - 1 ? ` · ${c.latest}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="sm" disabled={busy} onClick={onOverview}>
          <MessageSquare />
          {review.comments.length} {c.comments}
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={onChecks}>
          <CircleCheck />
          {checks.total
            ? `${w.checked} ${checks.completed} · ${w.attention} ${checks.attention}`
            : w.noChecks}
        </Button>
      </div>
      <details className="space-y-3 text-sm text-muted-foreground">
        <summary className="cursor-pointer">{c.details}</summary>
        <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-2">
          <dt>{c.source}</dt>
          <dd className="min-w-0 break-all font-mono text-xs">
            {version.workspace
              ? version.workspace.target.rootPath
              : version.usage?.projectLabels.join(' · ') || review.sessionId || c.unknown}
          </dd>
          <dt>{w.reviewers}</dt>
          <dd>
            {c.localReviewer}
            {checks.total > 0 ? ' · Jev · Beta' : ''}
          </dd>
        </dl>
        <p>
          {version.workspace
            ? p.snapshot
            : `${SCOPE_OPTIONS.find((option) => option.value === review.scope)?.label} · ${RANGE_LABELS[review.range]}`}{' '}
          · {c.frozen}
        </p>
      </details>
      <div className="flex flex-wrap gap-2">
        {window.api?.forflowJevAudit && (
          <Button
            size="sm"
            disabled={
              busy ||
              readOnly ||
              focusChanged ||
              (!version.audit.rows.length &&
                !version.workspace?.files.some((file) => file.status === 'read'))
            }
            onClick={onChecks}
          >
            <Bot />
            {w.start}
          </Button>
        )}
        <ButtonGroup aria-label={c.version}>
          <Button size="sm" variant="outline" disabled={busy || readOnly} onClick={onReread}>
            <RefreshCw />
            {c.reread}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={
              busy || readOnly || focusChanged || status === 'confirmed' || status === 'issues'
            }
            onClick={onConfirm}
          >
            <Check />
            {c.confirm}
          </Button>
        </ButtonGroup>
      </div>
      <p className="text-xs text-muted-foreground">
        {focusChanged ? w.focusChanged : c.confirmationMeaning}
      </p>
    </header>
  )
}
