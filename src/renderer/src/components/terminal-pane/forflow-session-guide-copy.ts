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
        'Choose an agent and describe the result you need, with relevant files and success criteria. Send the message to start.'
      ),
      next: translate(
        'forflow.sessionGuide.chatNext',
        'Use Chat for instructions and replies. Switch to Terminal for the execution details of a supported session.'
      )
    },
    {
      id: 'files',
      title: translate('forflow.sessionGuide.filesTitle', '2. Add reference files'),
      body: translate(
        'forflow.sessionGuide.filesBody',
        'Open View outputs → Files, then drag a reference file into the message and describe how to use it.'
      ),
      next: translate(
        'forflow.sessionGuide.filesNext',
        'References point to files on the task’s computer. For remote tasks, choose files readable there.'
      )
    },
    {
      id: 'parallel',
      title: translate('forflow.sessionGuide.parallelTitle', '3. Continue or delegate work'),
      body: translate(
        'forflow.sessionGuide.parallelBody',
        'Open Agent collaboration to continue the current session with another agent or fork it into a new workspace. For sequential or parallel tasks, use the examples on the Orchestration page.'
      ),
      next: translate(
        'forflow.sessionGuide.parallelNext',
        'Use the current task’s goal, progress and relevant files when handing off. Split view shares files; use separate workspaces for independent changes.'
      )
    },
    {
      id: 'review',
      title: translate('forflow.sessionGuide.reviewTitle', '4. Check the result'),
      body: canReview
        ? translate(
            'forflow.sessionGuide.reviewGit',
            'Use View outputs to inspect files and changes. Open Review results to check selected materials against your requirements.'
          )
        : translate(
            'forflow.sessionGuide.reviewFolder',
            'Use View outputs to inspect generated files. Open Review results to check selected materials against your requirements.'
          ),
      next: translate(
        'forflow.sessionGuide.reviewNext',
        'Return to the conversation with any findings and ask the agent to address them.'
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
        'Start the preview service, then open its address. Send annotations to the agent working on the page.'
      )
    }
  ]
}
