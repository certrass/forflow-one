export type CodexAutomation = {
  id: string
  name: string
  prompt: string
  kind: string
  status: string
  rrule: string
  model: string | null
  cwds: string[]
  targetThreadId: string | null
  updatedAt: number | null
  sourcePath: string
}

export type CodexAutomationIssue = {
  path: string
  code: 'permission' | 'invalid' | 'version' | 'oversized' | 'unreadable' | 'limit'
}

/** Local desktop definitions only; Codex retains scheduling and run history. */
export type CodexAutomationList = {
  sourceDirectory: string
  status: 'ready' | 'missing' | 'partial' | 'error'
  automations: CodexAutomation[]
  issues: CodexAutomationIssue[]
  readAt: number
}
