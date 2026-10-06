import { translate } from '@/i18n/i18n'

export function getForflowSessionGuideSteps(canReview: boolean): {
  id: string
  title: string
  body: string
  next: string
}[] {
  return [
    {
      id: 'chat',
      title: translate('forflow.sessionGuide.chatTitle', '1. Write a goal in Chat'),
      body: translate(
        'forflow.sessionGuide.chatBody',
        'Start Codex in this pane, then choose Chat. Describe the result you need, relevant files and how to check success. Review the draft before sending.'
      ),
      next: translate(
        'forflow.sessionGuide.chatNext',
        'Chat and Terminal share the same supported session. If Chat is unavailable, read the status beside the controls. Structured conversations do not have a terminal view.'
      )
    },
    {
      id: 'files',
      title: translate('forflow.sessionGuide.filesTitle', '2. Add reference files'),
      body: translate(
        'forflow.sessionGuide.filesBody',
        'Open Files and drag a file into the Chat input. Check the reference chip, then add what the agent should do with it. Remove an incorrect reference before sending.'
      ),
      next: translate(
        'forflow.sessionGuide.filesNext',
        'A reference is a file path, not an uploaded copy. The file must be readable on the execution host; sending lets the configured agent and model process the referenced material.'
      )
    },
    {
      id: 'parallel',
      title: translate('forflow.sessionGuide.parallelTitle', '3. Run tasks, then compare outputs'),
      body: translate(
        'forflow.sessionGuide.parallelBody',
        'Open Parallel work & comparison above. Give each agent the same goal and success criteria. When the outputs are ready, use Prepare comparison draft and add the materials.'
      ),
      next: translate(
        'forflow.sessionGuide.parallelNext',
        'Use a separate Git workspace for each version. Split view shares files; folder tasks should save outputs to different files or folders.'
      )
    },
    {
      id: 'review',
      title: translate('forflow.sessionGuide.reviewTitle', '4. Check the result'),
      body: canReview
        ? translate(
            'forflow.sessionGuide.reviewGit',
            'Open Review changes to inspect the workspace diff, then check output files and test results. This view includes all workspace changes; opening it does not commit or publish them.'
          )
        : translate(
            'forflow.sessionGuide.reviewFolder',
            'Open Files to inspect generated documents or code, then check the agent’s test results. This ordinary folder has no Git diff view; check the actual files before using the result.'
          ),
      next: translate(
        'forflow.sessionGuide.reviewNext',
        'If something is wrong, state the expected result in the same conversation. For a running Codex bridge session, use Add message to supplement the task or Stop to interrupt it.'
      )
    },
    {
      id: 'browser',
      title: translate(
        'forflow.sessionGuide.browserTitle',
        '5. Preview a page and give design feedback'
      ),
      body: translate(
        'forflow.sessionGuide.browserBody',
        'Open a Browser tab and enter the page or preview address. Use the element grabber for page context, or annotate the page with a specific change request.'
      ),
      next: translate(
        'forflow.sessionGuide.browserNext',
        'Send the selected context to the intended agent and check its response. A preview needs a running web service; opening a browser does not start your project’s server.'
      )
    }
  ]
}
