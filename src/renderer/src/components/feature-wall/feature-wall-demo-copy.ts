import { translate } from '@/i18n/i18n'

const copyKeys: Readonly<Record<string, string>> = {
  '0% used': 'forflow.demoCopy.zeroUsed',
  '96% used': 'forflow.demoCopy.almostUsed',
  'Resets in 5h': 'forflow.demoCopy.resetHours',
  'Resets in 47m': 'forflow.demoCopy.resetMinutes',
  '0% used 5h · 4% used wk': 'forflow.demoCopy.usageSummary',
  '96% used 47m': 'forflow.demoCopy.usageAlmost',
  Team: 'forflow.demoCopy.team',

  'set up orca.yaml': 'forflow.demoCopy.workspaceSetup',
  'fix login race condition': 'forflow.demoCopy.workspaceLogin',
  'speed up CI pipeline': 'forflow.demoCopy.workspaceCi',
  'Looking at the session middleware now…': 'forflow.demoCopy.inspectMiddleware',
  'Typecheck passes. Pulling on the login route next.': 'forflow.demoCopy.typecheckPassed',
  'Adding tests for the redirect path.': 'forflow.demoCopy.redirectTests',
  Bash: 'forflow.demoCopy.shellCommand',
  'Adding the email_verified column…': 'forflow.demoCopy.ac583591c8',
  'Wiring withSession middleware…': 'forflow.demoCopy.c9d391f27a',
  'PR 1/2 ready': 'forflow.demoCopy.519808266b',
  'PR 2/2 ready': 'forflow.demoCopy.cd61a6ece2',
  'Splitting auth rewrite into 2 PRs…': 'forflow.demoCopy.093f057fe3',
  'Writing the users table migration…': 'forflow.demoCopy.ac7a6b615f',
  'Sketching withSession middleware…': 'forflow.demoCopy.122ede91a0',
  'Make Starter card stand out': 'forflow.demoCopy.58ab04ce3d',
  'Let me click Try free to verify it still works.': 'forflow.demoCopy.9c5fd0933c',
  '(capturing page)': 'forflow.demoCopy.c830cd4a6b',
  'Backfill must run before commit if schema assumes new columns.': 'forflow.demoCopy.8af31637d2',
  'Sequence schema → backfill before commit': 'forflow.demoCopy.bba8d9ace5',
  'Silently skipping rows — log the count or surface it in the result.':
    'forflow.demoCopy.e3907ed521',
  'Log skipped rows in result': 'forflow.demoCopy.cb8f9621f4',
  'Run schema + backfill steps in order during migration': 'forflow.demoCopy.caa8d47d99',
  'Run schema + backfill in order during migration': 'forflow.demoCopy.6663aab9b6',
  'Awaits schema before backfill so commits stay in order. Skips rows with no tier on reruns.':
    'forflow.demoCopy.ba7fadfceb',
  '› renders metrics': 'forflow.demoCopy.b19ef02bf1',
  '› updates avatar': 'forflow.demoCopy.ffa444b29d',
  '› exports CSV': 'forflow.demoCopy.2941d328c5',
  '› toggles dark mode': 'forflow.demoCopy.a8e1167179',
  'review src/auth for missing error handling': 'forflow.demoCopy.6f1c4e74d8',
  'fix failing checkout test': 'forflow.demoCopy.65a70fc29a',
  Read: 'forflow.demoCopy.9b9a8d05a7',
  Grep: 'forflow.demoCopy.16970ed682',
  Edit: 'forflow.demoCopy.464c4ffd01',
  'Fixing both issues...': 'forflow.demoCopy.c7e3192115',
  '● Claude Code session started': 'forflow.demoCopy.b1b9acd9c4'
}

export function localizedDemoCopy(text: string): string {
  const key = copyKeys[text]
  return key ? translate(key, text) : text
}
