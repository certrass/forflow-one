import { useState } from 'react'
import type { WorkspaceReviewQuery } from '../../../../shared/workspace-review-types'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { WorkspaceReviewSessions } from './WorkspaceReviewSessions'
import { workspaceReviewCopy } from './workspace-review-copy'

type Selection = WorkspaceReviewQuery['selection']
export function WorkspaceReviewOptions({
  selection,
  disabled,
  onChange
}: {
  selection: Selection
  disabled: boolean
  onChange: (selection: Selection) => void
}): React.JSX.Element {
  const c = workspaceReviewCopy()
  const [sessionsOpen, setSessionsOpen] = useState(false)
  return (
    <div className="space-y-4">
      <details
        className="space-y-3"
        onToggle={(event) => setSessionsOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-medium">
          {c.optionalSessions}
          {selection.sessionIds.length > 0 && ` · ${selection.sessionIds.length}`}
        </summary>
        {sessionsOpen && (
          <WorkspaceReviewSessions
            selected={selection.sessionIds}
            disabled={disabled}
            onChange={(sessionIds) => onChange({ ...selection, sessionIds })}
          />
        )}
      </details>
      <details className="space-y-3">
        <summary className="cursor-pointer text-sm font-medium">{c.optionalPolicy}</summary>
        <p className="text-xs text-muted-foreground">{c.policyHint}</p>
        <Label htmlFor="workspace-review-policy">{c.policySource}</Label>
        <Textarea
          id="workspace-review-policy"
          value={selection.policyReference}
          maxLength={4000}
          disabled={disabled}
          onChange={(event) => onChange({ ...selection, policyReference: event.target.value })}
        />
        <Label>{c.applicability}</Label>
        <Select
          value={selection.applicability}
          disabled={disabled}
          onValueChange={(value) => {
            if (value === 'unconfirmed' || value === 'applies' || value === 'not_applicable') {
              onChange({ ...selection, applicability: value })
            }
          }}
        >
          <SelectTrigger aria-label={c.applicability}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unconfirmed">{c.unconfirmed}</SelectItem>
            <SelectItem value="applies">{c.applies}</SelectItem>
            <SelectItem value="not_applicable">{c.notApplicable}</SelectItem>
          </SelectContent>
        </Select>
        <Label htmlFor="workspace-review-policy-reason">{c.applicabilityReason}</Label>
        <Textarea
          id="workspace-review-policy-reason"
          value={selection.applicabilityReason}
          maxLength={2000}
          disabled={disabled}
          onChange={(event) => onChange({ ...selection, applicabilityReason: event.target.value })}
        />
      </details>
    </div>
  )
}
