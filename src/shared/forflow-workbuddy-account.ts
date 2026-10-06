export type WorkBuddyAccountStatus =
  | {
      state: 'signed-in'
      userId: string
      name: string | null
      accountType: 'personal' | 'enterprise' | null
      organization: string | null
    }
  | { state: 'signed-out' | 'not-installed' | 'unavailable' | 'local-only' }

export type ForflowWorkBuddyAccountApi = {
  getStatus(): Promise<WorkBuddyAccountStatus>
}
