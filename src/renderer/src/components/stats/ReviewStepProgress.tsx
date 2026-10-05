import { Check } from 'lucide-react'
import { translate } from '@/i18n/i18n'

export function ReviewStepProgress({
  current,
  steps
}: {
  current: number
  steps: string[]
}): React.JSX.Element {
  return (
    <ol
      aria-label={translate('forflow.review.progress', 'Review progress')}
      className="flex min-w-0 flex-1 gap-3"
    >
      {steps.map((label, index) => (
        <li
          key={label}
          aria-current={index + 1 === current ? 'step' : undefined}
          data-current={index + 1 === current}
          className="flex min-w-0 flex-1 items-start gap-2 border-b border-border pb-3 text-sm text-muted-foreground data-[current=true]:border-primary data-[current=true]:font-medium data-[current=true]:text-foreground"
        >
          <span
            aria-hidden="true"
            data-current={index + 1 === current}
            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground data-[current=true]:bg-primary data-[current=true]:text-primary-foreground"
          >
            {index + 1 < current ? <Check className="size-3" /> : index + 1}
          </span>
          <span className="min-w-0 break-words">{label}</span>
        </li>
      ))}
    </ol>
  )
}
