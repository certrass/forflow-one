import { useId } from 'react'
import { codexEvidenceKey, type CodexReviewVersion } from '../../../../shared/codex-review-types'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { jevDeliveryCopy } from './jev-delivery-copy'
import { jevDeliverySources } from './jev-delivery-sources'
import { reviewCopy } from './review-copy'
import { ReviewEvidenceNeeds } from './ReviewEvidenceNeeds'

export function JevDeliveryInput({
  version,
  evidenceKeys,
  handoffEvidenceKeys,
  busy,
  onChange,
  onLocate
}: {
  version: CodexReviewVersion
  evidenceKeys: string[]
  handoffEvidenceKeys: string[]
  busy: boolean
  onChange: (keys: string[], handoff: string[]) => void
  onLocate?: (key: string) => void
}): React.JSX.Element {
  const c = jevDeliveryCopy()
  const r = reviewCopy()
  const id = useId()
  const sources = jevDeliverySources(version)
  return (
    <div className="space-y-4" data-testid="jev-delivery-input">
      <details className="space-y-2 text-sm">
        <summary className="cursor-pointer font-medium">{c.criterion}</summary>
        <p className="whitespace-pre-wrap break-words text-muted-foreground">{version.focus}</p>
      </details>
      <div className="space-y-2">
        <h4 className="text-sm font-medium">
          {c.sources} · {c.selected} {evidenceKeys.length}/12
        </h4>
        <p className="text-sm text-muted-foreground">{c.sourceHint}</p>
        {sources.length === 0 && <p className="text-sm text-muted-foreground">{c.noSources}</p>}
        <ul className="scrollbar-sleek max-h-80 divide-y divide-border overflow-auto rounded-md border border-border">
          {sources.map((source, index) => {
            const checked = evidenceKeys.includes(source.key)
            return (
              <li
                key={source.key}
                data-current={checked}
                className="space-y-3 p-3 data-[current=true]:bg-accent"
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={`${id}-${index}`}
                    checked={checked}
                    disabled={busy || (!checked && evidenceKeys.length >= 12)}
                    aria-label={`${c.select}: ${source.label}`}
                    onCheckedChange={(value) =>
                      onChange(
                        value === true
                          ? [...evidenceKeys, source.key]
                          : evidenceKeys.filter((key) => key !== source.key),
                        handoffEvidenceKeys.filter((key) => value === true || key !== source.key)
                      )
                    }
                  />
                  <Label htmlFor={`${id}-${index}`} className="min-w-0 break-all">
                    {source.label}
                  </Label>
                </div>
                {source.location !== source.label && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">{r.source}</summary>
                    <p className="break-all font-mono">{source.location}</p>
                  </details>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  {checked && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${id}-${index}-handoff`}
                        checked={handoffEvidenceKeys.includes(source.key)}
                        disabled={busy || !checked}
                        aria-label={`${c.handoff}: ${source.label}`}
                        onCheckedChange={(value) =>
                          onChange(
                            evidenceKeys,
                            value === true
                              ? [...handoffEvidenceKeys, source.key]
                              : handoffEvidenceKeys.filter((key) => key !== source.key)
                          )
                        }
                      />
                      <Label htmlFor={`${id}-${index}-handoff`}>{c.handoff}</Label>
                    </div>
                  )}
                  {onLocate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => onLocate(source.key)}
                    >
                      {r.locate}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        {evidenceKeys.length > 0 && (
          <ReviewEvidenceNeeds
            files={(version.workspace?.files ?? []).filter(
              (file) => file.status === 'read' && evidenceKeys.includes(file.evidenceKey)
            )}
            hasConversations={version.audit.rows.some((row) =>
              evidenceKeys.includes(codexEvidenceKey(row))
            )}
          />
        )}
      </div>
    </div>
  )
}
