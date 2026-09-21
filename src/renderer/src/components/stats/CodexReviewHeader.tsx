import {
  ArrowLeft,
  Bot,
  Check,
  GitBranch,
  MessageSquare,
  RefreshCw,
  CircleCheck,
  Folder,
  CircleDot
} from 'lucide-react'
import type { CodexReview, CodexReviewVersion } from '../../../../shared/codex-review-types'
import { codexReviewStatus } from '../../../../shared/codex-review-types'
import type { JevReceipt } from '../../../../shared/jev-audit-types'
import { Button } from '../ui/button'
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
    <header className="space-y-5">
      <Button variant="ghost" size="sm" disabled={busy} onClick={onBack}>
        <ArrowLeft />
        {version.workspace ? p.back : c.back}
      </Button>
      <h3 className="break-words text-xl font-semibold">
        {version.workspace?.target.name ?? version.usage?.title ?? review.sessionId ?? c.unknown}
      </h3>
      <dl className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-4 gap-y-4 text-sm">
        <dt className="flex items-center gap-2 text-muted-foreground">
          <Folder className="size-4" />
          {c.source}
        </dt>
        <dd className="min-w-0 break-words">
          {version.workspace
            ? `${p.local} · ${version.workspace.target.rootPath}`
            : `Codex · ${version.usage?.projectLabels.join(' · ') || review.sessionId || c.unknown}`}
        </dd>
        <dt className="flex items-center gap-2 text-muted-foreground">
          <GitBranch className="size-4" />
          {c.version}
        </dt>
        <dd className="flex min-w-0 flex-wrap items-center gap-2">
          {selected > 0 && <span className="text-muted-foreground">v{selected} →</span>}
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
        </dd>
        <dt className="flex items-center gap-2 text-muted-foreground">
          <Bot className="size-4" />
          {w.reviewers}
        </dt>
        <dd>
          {c.localReviewer}
          {checks.total > 0 ? ' · Jev · Beta' : ''}
        </dd>
        <dt className="flex items-center gap-2 text-muted-foreground">
          <MessageSquare className="size-4" />
          {c.comments}
        </dt>
        <dd>
          <Button variant="link" size="xs" onClick={onOverview}>
            {review.comments.length} {c.comments}
          </Button>
        </dd>
        <dt className="flex items-center gap-2 text-muted-foreground">
          <CircleCheck className="size-4" />
          {w.checks}
        </dt>
        <dd>
          <Button variant="link" size="xs" onClick={onChecks}>
            {checks.total
              ? `${w.checked} ${checks.completed} · ${w.attention} ${checks.attention}`
              : w.noChecks}
          </Button>
        </dd>
        <dt className="flex items-center gap-2 text-muted-foreground">
          <CircleDot className="size-4" />
          {w.status}
        </dt>
        <dd>
          <Badge variant="outline">
            {readOnly
              ? c.historicBadge
              : status === 'confirmed'
                ? c.confirmed
                : status === 'issues'
                  ? c.hasIssues
                  : c.reviewing}
          </Badge>
        </dd>
      </dl>
      <p className="text-xs text-muted-foreground">
        {version.workspace
          ? p.snapshot
          : `${SCOPE_OPTIONS.find((option) => option.value === review.scope)?.label} · ${RANGE_LABELS[review.range]}`}{' '}
        · {c.frozen}
      </p>
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
      </div>
      <p className="text-xs text-muted-foreground">
        {focusChanged ? w.focusChanged : c.confirmationMeaning}
      </p>
    </header>
  )
}
