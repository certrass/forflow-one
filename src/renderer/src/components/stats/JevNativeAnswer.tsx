import type { JevResponse } from '../../../../shared/jev-audit-types'
import { jevDeliveryCopy } from './jev-delivery-copy'
import { jevScoreArithmeticDiagnostic } from '../../../../shared/jev-delivery-assessment'
import { jevDeliveryResultCopy } from './jev-delivery-result-copy'

export function JevNativeAnswer({
  answer,
  question
}: {
  answer: JevResponse['answers'][string]
  question?: string
}): React.JSX.Element {
  const c = jevDeliveryCopy()
  const guide = jevDeliveryResultCopy()
  if (answer.type === 'noul') {
    return (
      <div className="space-y-2">
        <p className="text-sm">
          {question === 'documented_current_nonconformance'
            ? guide.nonconformanceProbability
            : c.probability}
          : {(answer.noul * 100).toFixed(1)}%
        </p>
        {question === 'documented_current_nonconformance' && (
          <p className="text-xs text-muted-foreground">{guide.nonconformanceHint}</p>
        )}
      </div>
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
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>{c.operabilityHint}</p>
          <p>{guide.scoreHint}</p>
        </div>
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
