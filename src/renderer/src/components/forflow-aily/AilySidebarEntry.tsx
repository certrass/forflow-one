import { MessagesSquare } from 'lucide-react'
import { Button } from '../ui/button'
import { isForflowBuild } from '../../../../shared/product-branding'
import { useAppStore } from '@/store'
import { ailyCopy } from './aily-copy'

export function AilySidebarEntry(): React.JSX.Element | null {
  const activeView = useAppStore((state) => state.activeView)
  const setActiveView = useAppStore((state) => state.setActiveView)
  if (!isForflowBuild()) {
    return null
  }
  return (
    <Button
      variant={activeView === 'aily' ? 'secondary' : 'ghost'}
      size="sm"
      className="justify-start"
      aria-current={activeView === 'aily' ? 'page' : undefined}
      onClick={() => setActiveView('aily')}
    >
      <MessagesSquare />
      {ailyCopy().title}
    </Button>
  )
}
