import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { SOURCE_CONTROL_TREE_FILE_PADDING_PX, SOURCE_CONTROL_TREE_INDENT_PX } from './row-layout'

export function SubmodulePlaceholderRow({
  depth,
  state,
  message
}: {
  depth: number
  state: 'loading' | 'empty' | 'error' | 'truncated'
  message?: string
}): React.JSX.Element {
  const fallback =
    state === 'error'
      ? translate('forflow.finalCopy.9e8fc276af', 'Failed to load submodule changes')
      : state === 'empty'
        ? translate('forflow.finalCopy.01c66fe5a2', 'No changes in submodule')
        : state === 'truncated'
          ? translate(
              'auto.components.right.sidebar.SourceControl.submoduleTruncated',
              'More submodule changes were omitted'
            )
          : translate('forflow.finalCopy.338e9360a7', 'Loading submodule changes…')
  return (
    <div
      className={cn(
        'flex items-center gap-1 pr-3 py-1 text-[11px]',
        state === 'error' ? 'text-destructive' : 'text-muted-foreground'
      )}
      style={{
        paddingLeft: `${depth * SOURCE_CONTROL_TREE_INDENT_PX + SOURCE_CONTROL_TREE_FILE_PADDING_PX}px`
      }}
    >
      {state === 'loading' && <Loader2 className="size-3 shrink-0 animate-spin" />}
      <span className="min-w-0 truncate">{message ?? fallback}</span>
    </div>
  )
}
