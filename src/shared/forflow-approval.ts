export type ForflowApprovalRequest = {
  id: string
  kind: 'upload' | 'browser-permission'
  destination: string
  description: string
  expiresAt: number
}

export type ForflowApprovalApi = {
  pending(): Promise<ForflowApprovalRequest[]>
  decide(id: string, allow: boolean): Promise<boolean>
  onChanged(callback: () => void): () => void
}
