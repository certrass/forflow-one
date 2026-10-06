import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { translate } from '@/i18n/i18n'
import { forflowParallelPrompts } from './forflow-parallel-prompts'

export function ForflowTaskPrompt({
  value,
  onChange,
  creating
}: {
  value: string
  onChange?: (value: string) => void
  creating: boolean
}): React.JSX.Element {
  useTranslation()
  const id = useId()
  const parallelPrompts = forflowParallelPrompts()
  const examples = [
    {
      label: translate('forflow.taskPrompt.explore', 'Understand this project'),
      prompt: translate(
        'forflow.taskPrompt.explorePrompt',
        'Read the project README and key files. Explain its purpose, directory structure and how to run it, with file references. Suggest one small first task. Do not modify files yet.'
      )
    },
    {
      label: translate('forflow.taskPrompt.change', 'Make a small change'),
      prompt: translate(
        'forflow.taskPrompt.changePrompt',
        'Goal: [describe one small change].\nReferences: [files or requirements].\nFirst explain the approach, then implement and test it. Report changed files and test results.\nConstraints: preserve unrelated changes; do not commit or publish automatically.'
      )
    },
    {
      label: translate('forflow.taskPrompt.review', 'Review existing work'),
      prompt: translate(
        'forflow.taskPrompt.reviewPrompt',
        'Review the existing project changes without modifying files. Prioritize correctness, regressions and missing checks. Cite file locations and explain how to reproduce each issue. Distinguish verified results from suggestions.'
      )
    }
  ]
  return (
    <section className="space-y-2" data-forflow-task-prompt="">
      <label htmlFor={id} className="text-sm font-medium">
        {translate('forflow.taskPrompt.label', 'What do you want to accomplish?')}
      </label>
      {!value.trim() && (
        <div className="flex flex-wrap gap-2">
          {Object.values(parallelPrompts).map((example) => (
            <Button
              key={example.label}
              type="button"
              size="xs"
              variant="outline"
              disabled={creating || Boolean(value.trim()) || !onChange}
              onClick={() => {
                if (!value.trim() && !creating) {
                  onChange?.(example.prompt)
                }
              }}
            >
              {example.label}
            </Button>
          ))}
        </div>
      )}
      <Textarea
        id={id}
        aria-describedby={`${id}-hint`}
        data-workspace-task-prompt="true"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={creating}
        rows={4}
        placeholder={translate(
          'forflow.taskPrompt.placeholder',
          'Describe the goal, reference material, expected result and constraints.'
        )}
      />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {translate(
          'forflow.taskPrompt.hint',
          'Choose an agent after writing the task. Codex is recommended for Chat. Creating the workspace prepares an editable draft; send it when ready to start.'
        )}
      </p>
      <details>
        <summary className="cursor-pointer text-xs font-medium">
          {translate(
            'forflow.taskPrompt.examples',
            'Not sure what to write? Start with an example'
          )}
        </summary>
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <Button
                key={example.label}
                size="xs"
                variant="outline"
                disabled={creating || Boolean(value.trim()) || !onChange}
                onClick={() => {
                  if (!value.trim() && !creating) {
                    onChange?.(example.prompt)
                  }
                }}
              >
                {example.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {value.trim()
              ? translate(
                  'forflow.taskPrompt.keepDraft',
                  'Your text is preserved. Clear the input first if you want to insert an example.'
                )
              : translate(
                  'forflow.taskPrompt.exampleHint',
                  'An example only fills this input. Replace bracketed placeholders with your own requirements before sending.'
                )}
          </p>
        </div>
      </details>
    </section>
  )
}
