import { DEFAULT_WORKSPACE_STATUSES } from '../../../shared/workspace-status-defaults'
import type { WorkspaceStatusDefinition } from '../../../shared/worktree/types'
import { translate } from './i18n'

export function workspaceStatusDisplayLabel(
  status: Pick<WorkspaceStatusDefinition, 'id' | 'label'>
): string {
  const original = DEFAULT_WORKSPACE_STATUSES.find((entry) => entry.id === status.id)
  if (!original || original.label !== status.label) {
    return status.label
  }
  switch (original.id) {
    case 'todo':
      return translate('forflow.workspaceStatus.todo', 'Todo')
    case 'in-progress':
      return translate('forflow.workspaceStatus.inProgress', 'In progress')
    case 'in-review':
      return translate('forflow.workspaceStatus.inReview', 'In review')
    case 'completed':
      return translate('forflow.workspaceStatus.completed', 'Done')
  }
}
