import { z } from 'zod'
import { Badge } from '../ui/badge'
import { jevDeliveryCopy } from './jev-delivery-copy'
import { reviewWorkspaceCopy } from './review-workspace-copy'

const deliveryPreviewSchema = z.object({
  model: z.string(),
  state: z.object({
    targetCriterion: z.object({ text: z.string() }),
    sources: z.array(
      z.object({
        id: z.string(),
        role: z.string(),
        text: z.string(),
        truncated: z.boolean(),
        omitted: z.boolean()
      })
    ),
    handoff: z.object({ sourceIds: z.array(z.string()) }),
    coverage: z.object({ partial: z.boolean() })
  })
})

export function JevDeliveryPreview({ input }: { input: unknown }): React.JSX.Element | null {
  const c = jevDeliveryCopy()
  const w = reviewWorkspaceCopy()
  const parsed = deliveryPreviewSchema.safeParse(input)
  if (!parsed.success) {
    return null
  }
  const { model, state } = parsed.data
  const roles: Record<string, string> = c.roles
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{model}</p>
      <p className="whitespace-pre-wrap break-words text-sm">
        {c.criterion} · {state.targetCriterion.text}
      </p>
      {state.coverage.partial && <Badge variant="outline">{w.partial}</Badge>}
      {state.sources.map((source) => (
        <section key={source.id} className="space-y-2">
          <h5 className="text-sm font-medium">
            {source.id} · {roles[source.role] ?? source.role}
          </h5>
          {state.handoff.sourceIds.includes(source.id) && (
            <Badge variant="outline">{c.handoff}</Badge>
          )}
          {(source.truncated || source.omitted) && <Badge variant="outline">{w.partial}</Badge>}
          <pre className="scrollbar-sleek max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
            {source.text}
          </pre>
        </section>
      ))}
    </div>
  )
}
