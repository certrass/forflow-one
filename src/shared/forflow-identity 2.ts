import { z } from 'zod'

export const forflowUserSchema = z.object({
  id: z.string().min(1).max(100),
  username: z.string().min(1).max(64),
  displayName: z.string().min(1).max(80),
  role: z.enum(['admin', 'member']),
  disabled: z.boolean()
})
export const forflowSessionSchema = z.object({
  user: forflowUserSchema,
  tenant: z.string().min(1).max(100),
  expiresAt: z.number().finite()
})
export const forflowLoginSchema = forflowSessionSchema.extend({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/)
})
export const forflowCredentialsSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256)
})
export const forflowCreateUserSchema = forflowCredentialsSchema.extend({
  displayName: z.string().min(1).max(80),
  role: z.enum(['admin', 'member'])
})
export const forflowUserStateSchema = z.object({
  id: z.string().min(1).max(100),
  disabled: z.boolean()
})
export const forflowResetPasswordSchema = z.object({
  id: z.string().min(1).max(100),
  password: z.string().min(12).max(256)
})
export const forflowAuditSchema = z.object({
  verification: z.object({ events: z.number(), headHash: z.string() }),
  events: z
    .array(
      z.object({
        sequence: z.number(),
        body: z.string(),
        previous_hash: z.string(),
        hash: z.string()
      })
    )
    .max(100)
})

export type ForflowUser = z.infer<typeof forflowUserSchema>
export type ForflowSession = z.infer<typeof forflowSessionSchema>
export type ForflowIdentityStatus = {
  serverUrl: string | null
  state: 'local' | 'signed-out' | 'connected' | 'unavailable'
  session: ForflowSession | null
  persistence: 'encrypted' | 'memory' | 'none'
  error?: string
}
export type ForflowIdentityApi = {
  status: () => Promise<ForflowIdentityStatus>
  configure: (serverUrl: string | null) => Promise<ForflowIdentityStatus>
  login: (credentials: z.infer<typeof forflowCredentialsSchema>) => Promise<ForflowIdentityStatus>
  logout: () => Promise<ForflowIdentityStatus>
  users: () => Promise<ForflowUser[]>
  createUser: (input: z.infer<typeof forflowCreateUserSchema>) => Promise<ForflowUser>
  setUserDisabled: (input: z.infer<typeof forflowUserStateSchema>) => Promise<void>
  resetPassword: (input: z.infer<typeof forflowResetPasswordSchema>) => Promise<void>
  audit: () => Promise<z.infer<typeof forflowAuditSchema>>
}
