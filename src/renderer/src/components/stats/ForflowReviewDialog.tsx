import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { StatsPane } from './StatsPane'

export default function ForflowReviewDialog(): React.JSX.Element {
  const closeModal = useAppStore((state) => state.closeModal)
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          closeModal()
        }
      }}
    >
      <DialogContent
        className="max-h-[90vh] sm:max-w-4xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{translate('forflow.focus.review', 'Review results')}</DialogTitle>
          <DialogDescription>
            {translate(
              'forflow.focus.reviewDescription',
              'Check deliverables against your requirements and follow up on findings.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto scrollbar-sleek">
          <StatsPane reviewOnly />
        </div>
      </DialogContent>
    </Dialog>
  )
}
