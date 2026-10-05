import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { FileText, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'

export function NativeChatFileReferencePill({
  node,
  selected,
  deleteNode
}: NodeViewProps): React.JSX.Element {
  const path = String(node.attrs.path)
  const name = path.split(/[\\/]/).findLast(Boolean) || path
  return (
    <NodeViewWrapper as="span" className="inline" contentEditable={false}>
      <Badge
        variant={selected ? 'default' : 'secondary'}
        data-native-chat-file-reference={path}
        title={path}
        className="max-w-full align-baseline"
      >
        <FileText aria-hidden="true" />
        <span className="truncate">{name}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={translate('forflow.composer.removeFile', 'Remove reference: {{name}}', {
            name: path
          })}
          onMouseDown={(event) => event.preventDefault()}
          onClick={deleteNode}
        >
          <X aria-hidden="true" />
        </Button>
      </Badge>
    </NodeViewWrapper>
  )
}
