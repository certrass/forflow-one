import { useTranslation } from 'react-i18next'
import { translate } from '@/i18n/i18n'

export function ForflowSetupGuide(): React.JSX.Element {
  useTranslation()
  const steps = [
    [
      translate('forflow.firstTask.projectTitle', '1. Choose the project and location'),
      translate(
        'forflow.firstTask.projectBody',
        'Add a Git repository or an ordinary folder. Start with a small local project. The selected execution location determines where files are read and commands run.'
      )
    ],
    [
      translate('forflow.firstTask.agentTitle', '2. Prepare Codex'),
      translate(
        'forflow.firstTask.agentBody',
        'Install and sign in to Codex, then open Settings → Agents to detect it. This release prioritizes Codex Chat. A Forflow account or saved model API key does not sign you in to the agent.'
      )
    ],
    [
      translate('forflow.firstTask.goalTitle', '3. Write one clear task'),
      translate(
        'forflow.firstTask.goalBody',
        'Choose Create task or Parallel task. Fill in the goal, reference material, expected result and constraints. Use an example if needed. Review the prepared Chat draft and send it when ready.'
      )
    ],
    [
      translate('forflow.firstTask.materialTitle', '4. Add material and follow progress'),
      translate(
        'forflow.firstTask.materialBody',
        'Open Files and drag a file into the Chat input as a reference. Check the execution location and material before sending. Chat and Terminal can show the same supported session; use the workspace guide whenever you need help.'
      )
    ],
    [
      translate('forflow.firstTask.resultTitle', '5. Inspect the result before using it'),
      translate(
        'forflow.firstTask.resultBody',
        'Read output files and test results. Git projects also offer Review changes. Preview web pages in Browser, or annotate an element with feedback. Ask for corrections in the same conversation.'
      )
    ],
    [
      translate('forflow.firstTask.parallelTitle', '6. Try parallel work and task sources'),
      translate(
        'forflow.firstTask.parallelBody',
        'Split view shares this workspace’s files. Create a separate Git worktree for independent changes. To import existing work, connect Feishu tasks in Settings → Integrations, then read and preview a task before preparing a conversation.'
      )
    ]
  ]
  return (
    <div className="space-y-5 p-6" data-testid="forflow-setup-guide">
      <p className="text-sm text-muted-foreground">
        {translate(
          'forflow.firstTask.intro',
          'Start by completing one small task. Team accounts and external task sources can be configured when you need them; the eight-item Getting Started checklist remains available.'
        )}
      </p>
      {steps.map(([title, body]) => (
        <section key={title} className="space-y-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{body}</p>
        </section>
      ))}
      <details>
        <summary className="cursor-pointer text-sm font-medium">
          {translate('forflow.firstTask.teamTitle', 'Team deployment, model accounts and upgrades')}
        </summary>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
          <p>
            {translate(
              'forflow.firstTask.teamBody',
              'Use the identity service address provided by your administrator for team accounts. Model service credentials are configured separately; saved API accounts are not automatically passed to every agent.'
            )}
          </p>
          <p>
            {translate(
              'forflow.firstTask.upgradeBody',
              'Use a verified Forflow installation package for upgrades, keep a rollback copy and exit the app before replacing it. Enterprise runtime policy and full business auditing require their own deployment and validation.'
            )}
          </p>
        </div>
      </details>
    </div>
  )
}
