import { useId } from 'react'
import type { CodexReviewVersion } from '../../../../shared/codex-review-types'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { jevAuditCopy } from './jev-audit-copy'
import { jevDeliverySources } from './jev-delivery-sources'

export function JevRecordInput({
  version,
  selected,
  claim,
  busy,
  onSelect,
  onClaim
}: {
  version: CodexReviewVersion
  selected: string
  claim: string
  busy: boolean
  onSelect: (key: string) => void
  onClaim: (claim: string) => void
}): React.JSX.Element {
  const c = jevAuditCopy()
  const id = useId()
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${id}-record`}>{c.record}</Label>
        <Select value={selected} disabled={busy} onValueChange={onSelect}>
          <SelectTrigger id={`${id}-record`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {jevDeliverySources(version).map((source) => (
              <SelectItem key={source.key} value={source.key}>
                {source.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-claim`}>{c.claim}</Label>
        <Textarea
          id={`${id}-claim`}
          value={claim}
          disabled={busy}
          maxLength={2000}
          placeholder={c.claimHint}
          onChange={(event) => onClaim(event.target.value)}
        />
      </div>
    </>
  )
}
