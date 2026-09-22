import { useId, useState } from 'react'
import { ArrowUp, File, Folder, Loader2 } from 'lucide-react'
import type { WorkspaceReviewTarget } from '../../../../shared/workspace-review-types'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { workspaceReviewFileCopy } from './workspace-review-file-copy'
import {
  suggestedReviewFilePurpose,
  type WorkspaceReviewFileSelection
} from './workspace-review-file-selection'
import { useWorkspaceReviewDirectory } from './use-workspace-review-directory'
import { WorkspaceReviewSelectedFiles } from './WorkspaceReviewSelectedFiles'

type WorkspaceReviewFilePickerProps = {
  target: WorkspaceReviewTarget | undefined
  selected: WorkspaceReviewFileSelection
  disabled: boolean
  onChange: (files: WorkspaceReviewFileSelection) => void
}

export function WorkspaceReviewFilePicker(
  props: WorkspaceReviewFilePickerProps
): React.JSX.Element {
  const c = workspaceReviewFileCopy()
  if (!props.target) {
    return <p className="text-xs text-muted-foreground">{c.chooseProject}</p>
  }
  if (!props.target.available) {
    return (
      <p className="text-xs text-muted-foreground">
        {props.target.unavailableReason ?? c.unsupported}
      </p>
    )
  }
  return (
    <WorkspaceReviewFileBrowser
      key={`${props.target.id}:${props.target.hostId}:${props.target.rootPath}`}
      {...props}
      target={props.target}
    />
  )
}

function WorkspaceReviewFileBrowser({
  target,
  selected,
  disabled,
  onChange
}: WorkspaceReviewFilePickerProps & { target: WorkspaceReviewTarget }): React.JSX.Element {
  const c = workspaceReviewFileCopy()
  const id = useId()
  const [directory, setDirectory] = useState('')
  const [filter, setFilter] = useState('')
  const { result, error, loading, showLoading, retry } = useWorkspaceReviewDirectory(
    target.id,
    directory
  )
  const entries =
    result?.entries.filter((entry) =>
      entry.name.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase())
    ) ?? []
  const navigate = (path: string): void => {
    setFilter('')
    setDirectory(path)
  }
  const toggleFile = (path: string): void => {
    if (disabled) {
      return
    }
    const checked = selected.some((file) => file.path === path)
    if (checked) {
      onChange(selected.filter((file) => file.path !== path))
    } else if (selected.length < 40) {
      onChange([...selected, { path, kind: suggestedReviewFilePurpose(path) }])
    }
  }
  return (
    <div className="space-y-3" data-testid="workspace-review-file-picker">
      <p className="text-xs text-muted-foreground">{c.browseNote}</p>
      <div className="rounded-md border border-border">
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled || !directory}
              onClick={() => navigate('')}
            >
              {c.root}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled || !directory}
              onClick={() => navigate(directory.split('/').slice(0, -1).join('/'))}
            >
              <ArrowUp />
              {c.parent}
            </Button>
          </div>
          <p
            aria-label={c.currentFolder}
            className="break-all font-mono text-xs text-muted-foreground"
          >
            {directory || c.root}
          </p>
          <Input
            aria-label={c.search}
            placeholder={c.search}
            value={filter}
            disabled={disabled || loading}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>
        <div className="scrollbar-sleek max-h-64 min-h-24 overflow-auto p-3" aria-busy={loading}>
          {showLoading && (
            <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {c.loading}
            </p>
          )}
          {error && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
              <Button type="button" variant="outline" size="xs" disabled={disabled} onClick={retry}>
                {c.retry}
              </Button>
            </div>
          )}
          {result && entries.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {result.entries.length === 0 ? c.empty : c.noMatches}
            </p>
          )}
          <ul className="space-y-1">
            {entries.map((entry, index) => {
              const checked = selected.some((file) => file.path === entry.path)
              return (
                <li key={entry.path}>
                  {entry.kind === 'directory' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      disabled={disabled}
                      aria-label={`${c.openFolder} ${entry.path}`}
                      onClick={() => navigate(entry.path)}
                    >
                      <Folder />
                      <span className="min-w-0 truncate">{entry.name}</span>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3 py-2">
                      <Checkbox
                        id={`${id}-${index}`}
                        aria-label={entry.path}
                        checked={checked}
                        disabled={disabled || (!checked && selected.length >= 40)}
                        onCheckedChange={() => toggleFile(entry.path)}
                      />
                      <span className="shrink-0 text-muted-foreground">
                        <File className="size-4" />
                      </span>
                      <Label htmlFor={`${id}-${index}`} className="min-w-0 break-all">
                        {entry.name}
                      </Label>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      {result?.truncated && (
        <p role="status" className="text-xs text-muted-foreground">
          {c.truncated}
        </p>
      )}
      <WorkspaceReviewSelectedFiles selected={selected} disabled={disabled} onChange={onChange} />
    </div>
  )
}
