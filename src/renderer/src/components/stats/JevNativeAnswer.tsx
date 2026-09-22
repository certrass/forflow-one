import type { JevResponse } from '../../../../shared/jev-audit-types'
import { jevDeliveryCopy } from './jev-delivery-copy'
import { jevScoreArithmeticDiagnostic } from '../../../../shared/jev-delivery-assessment'

export function JevNativeAnswer({
  answer
}: {
  answer: JevResponse['answers'][string]
}): React.JSX.Element {
  const c = jevDeliveryCopy()
  if (answer.type === 'noul') {
    return (
      <p className="text-sm">
        {c.probability}: {(answer.noul * 100).toFixed(1)}%
      </p>
    )
  }
  const labels: Record<string, string> = c.choices
  const arithmetic = jevScoreArithmeticDiagnostic(answer)
  return (
    <div className="space-y-2">
      <p className="text-sm">
        {answer.type === 'choice'
          ? (labels[answer.choice] ?? answer.choice)
          : `${answer.score.toFixed(2)} / 4`}
        {' · '}
        {c.confidence}: {(answer.confidence * 100).toFixed(1)}%
      </p>
      {answer.type === 'score' && (
        <p className="text-xs text-muted-foreground">{c.operabilityHint}</p>
      )}
      {arithmetic?.differs && (
        <p className="text-xs text-muted-foreground">
          {c.scoreDifference}: {arithmetic.weighted.toFixed(2)} · {c.scoreDifferenceHint}
        </p>
      )}
      <details className="space-y-2">
        <summary className="cursor-pointer text-xs text-muted-foreground">{c.distribution}</summary>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-xs">
          {Object.entries(answer.probabilities).map(([label, probability]) => (
            <div key={label} className="contents">
              <dt className="break-words">
                {answer.type === 'score'
                  ? `${label} · ${answer.legend[label] ?? ''}`
                  : (labels[label] ?? label)}
              </dt>
              <dd className="tabular-nums">{(probability * 100).toFixed(1)}%</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  )
}
