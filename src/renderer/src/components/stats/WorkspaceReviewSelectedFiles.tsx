import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { workspaceReviewFileCopy } from './workspace-review-file-copy'
import {
  isReviewFilePurpose,
  type WorkspaceReviewFileSelection
} from './workspace-review-file-selection'

export function WorkspaceReviewSelectedFiles({
  selected,
  disabled,
  onChange
}: {
  selected: WorkspaceReviewFileSelection
  disabled: boolean
  onChange: (files: WorkspaceReviewFileSelection) => void
}): React.JSX.Element {
  const c = workspaceReviewFileCopy()
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {c.selected} · {selected.length}/40
      </p>
      {selected.length === 0 ? (
        <p className="text-xs text-muted-foreground">{c.noSelection}</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{c.purposeNote}</p>
          <ul className="scrollbar-sleek max-h-60 divide-y divide-border overflow-auto">
            {selected.map((file) => (
              <li key={file.path} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-0 flex-1 break-all font-mono text-xs">{file.path}</span>
                <Select
                  value={file.kind}
                  disabled={disabled}
                  onValueChange={(kind) => {
                    if (isReviewFilePurpose(kind)) {
                      onChange(
                        selected.map((entry) =>
                          entry.path === file.path ? { ...entry, kind } : entry
                        )
                      )
                    }
                  }}
                >
                  <SelectTrigger aria-label={`${c.purpose}: ${file.path}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code">{c.code}</SelectItem>
                    <SelectItem value="document">{c.document}</SelectItem>
                    <SelectItem value="verification">{c.verification}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={disabled}
                  aria-label={`${c.remove} ${file.path}`}
                  onClick={() => onChange(selected.filter((entry) => entry.path !== file.path))}
                >
                  {c.remove}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
      {selected.length >= 40 && (
        <p role="status" className="text-xs text-muted-foreground">
          {c.limit}
        </p>
      )}
    </div>
  )
}
