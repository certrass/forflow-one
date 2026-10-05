import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import type { WorkspaceReviewTarget } from '../../../../shared/workspace-review-types'
import { Button } from '../ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { workspaceReviewCopy } from './workspace-review-copy'

export function WorkspaceReviewTargetPicker({
  targets,
  value,
  disabled,
  onChange
}: {
  targets: WorkspaceReviewTarget[]
  value: string
  disabled: boolean
  onChange: (id: string) => void
}): React.JSX.Element {
  const c = workspaceReviewCopy()
  const [open, setOpen] = useState(false)
  const selected = targets.find((target) => target.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label={c.target}
          aria-expanded={open}
          disabled={disabled}
        >
          <span className="max-w-80 truncate">{selected?.name ?? c.chooseTarget}</span>
          <ChevronsUpDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <Command>
          <CommandInput placeholder={c.searchTargets} />
          <CommandList>
            <CommandEmpty>{c.noTargets}</CommandEmpty>
            {targets.map((target) => (
              <CommandItem
                key={target.id}
                value={`${target.id} ${target.name} ${target.rootPath}`}
                onSelect={() => {
                  onChange(target.id)
                  setOpen(false)
                }}
              >
                <div className="min-w-0 space-y-1">
                  <p className="break-words">{target.name}</p>
                  <p className="break-all text-xs text-muted-foreground">{target.rootPath}</p>
                  {!target.available && (
                    <p className="text-xs text-muted-foreground">
                      {target.unavailableReason ?? c.unsupported}
                    </p>
                  )}
                </div>
                {target.id === value && <Check className="ml-auto size-4 shrink-0" />}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
