import type { TaskProvider } from '../../../../shared/task-providers'

export function getAutomationSourceProviderLabel(provider: TaskProvider): string {
  switch (provider) {
    case 'feishu':
      return '飞书'
    case 'github':
      return 'GitHub'
    case 'gitlab':
      return 'GitLab'
    case 'linear':
      return 'Linear'
    case 'jira':
      return 'Jira'
  }
}
