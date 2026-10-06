import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { requestContextualTourWhenReady } from '@/components/contextual-tours/request-contextual-tour-when-ready'
import { getForflowSessionGuideSteps } from './forflow-session-guide-copy'

export function ForflowSessionGuide({ canReview }: { canReview: boolean }): React.JSX.Element {
  useTranslation()
  const [open, setOpen] = useState(false)
  const cancelReplay = useRef<(() => void) | null>(null)
  const activeTour = useAppStore((state) => state.activeContextualTourId)
  const steps = getForflowSessionGuideSteps(canReview)
  useEffect(() => () => cancelReplay.current?.(), [])
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={translate('forflow.sessionGuide.label', 'How to use this workspace')}
          title={translate('forflow.sessionGuide.label', 'How to use this workspace')}
        >
          <CircleHelp />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)]"
        aria-label={translate('forflow.sessionGuide.label', 'How to use this workspace')}
        data-forflow-session-guide=""
        data-pane-prevent-terminal-focus=""
      >
        <div className="max-h-[min(32rem,70vh)] space-y-3 overflow-y-auto scrollbar-sleek p-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">
              {translate('forflow.sessionGuide.title', 'Complete your first task')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {translate('forflow.sessionGuide.intro', 'Find the next step for your task.')}
            </p>
          </div>
          <Accordion type="single" collapsible defaultValue="chat">
            {steps.map((step) => (
              <AccordionItem key={step.id} value={step.id}>
                <AccordionTrigger>{step.title}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm leading-relaxed">
                    <p>{step.body}</p>
                    <p className="text-xs text-muted-foreground">{step.next}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={Boolean(activeTour)}
              onClick={() => {
                setOpen(false)
                cancelReplay.current?.()
                cancelReplay.current = requestContextualTourWhenReady({
                  id: 'workspace-agent-sessions',
                  source: 'forflow_session_guide'
                })
              }}
            >
              {translate('forflow.sessionGuide.showControls', 'Show split and parallel controls')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              {translate('forflow.sessionGuide.close', 'Close guide')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
