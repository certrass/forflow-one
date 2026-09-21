import { z } from 'zod'
import { Badge } from '../ui/badge'
import { reviewCopy } from './review-copy'
import { reviewWorkspaceCopy } from './review-workspace-copy'

const previewSchema = z.object({
  model: z.string(),
  state: z.object({
    focus: z.string(),
    claim: z.string(),
    record: z.string(),
    result: z.string().nullable(),
    partial: z.boolean()
  })
})

export function JevRequestPreview({ body }: { body: string }): React.JSX.Element {
  const c = reviewCopy()
  const w = reviewWorkspaceCopy()
  let input: unknown
  try {
    input = JSON.parse(body)
  } catch {
    input = null
  }
  const parsed = previewSchema.safeParse(input)
  return (
    <div className="space-y-3" data-testid="jev-request-preview">
      {parsed.success && (
        <>
          <p className="text-xs text-muted-foreground">
            {c.model} · {parsed.data.model}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm">{parsed.data.state.focus}</p>
          {parsed.data.state.claim && (
            <p className="whitespace-pre-wrap break-words text-sm">{parsed.data.state.claim}</p>
          )}
          {parsed.data.state.partial && <Badge variant="outline">{w.partial}</Badge>}
          {[
            [w.sentRecord, parsed.data.state.record],
            [w.sentResult, parsed.data.state.result ?? w.noReturn]
          ].map(([label, text]) => (
            <div className="space-y-2" key={label}>
              <h5 className="text-sm font-medium">{label}</h5>
              <pre className="scrollbar-sleek max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
                {text}
              </pre>
            </div>
          ))}
        </>
      )}
      <details className="space-y-2">
        <summary className="cursor-pointer text-xs text-muted-foreground">{w.request}</summary>
        <pre
          tabIndex={0}
          className="scrollbar-sleek max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs"
        >
          {input ? JSON.stringify(input, null, 2) : body}
        </pre>
      </details>
    </div>
  )
}
