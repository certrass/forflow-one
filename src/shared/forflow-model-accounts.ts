import { z } from 'zod'

export const forflowModelProviderSchema = z.enum(['kimi', 'zhipu', 'deepseek', 'jev'])
export type ForflowModelProvider = z.infer<typeof forflowModelProviderSchema>

export const FORFLOW_MODEL_PROVIDERS = {
  kimi: {
    label: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    modelExample: 'kimi-k3',
    docsUrl: 'https://platform.kimi.com/docs/get-api-key'
  },
  zhipu: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    modelExample: 'glm-5.3',
    docsUrl: 'https://docs.bigmodel.cn/cn/guide/develop/openai/introduction'
  },
  jev: {
    label: 'Jev · 审计 Beta',
    baseUrl: 'https://api.typesafe.ai/v1',
    modelExample: 'jev-1.13.0',
    docsUrl: 'https://docs.typesafe.ai/introduction/quickstart'
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    modelExample: 'deepseek-flash',
    docsUrl: 'https://api-docs.deepseek.com/'
  }
} satisfies Record<
  ForflowModelProvider,
  {
    label: string
    baseUrl: string
    modelExample: string
    docsUrl: string
  }
>

export const forflowModelAccountInputSchema = z
  .object({
    provider: forflowModelProviderSchema,
    model: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/),
    apiKey: z
      .string()
      .trim()
      .min(1)
      .max(4096)
      .regex(/^[\x21-\x7e]+$/)
      .optional()
  })
  .strict()
  .refine((value) => value.provider !== 'jev' || /^jev-\d+\.\d+\.\d+$/.test(value.model), {
    message: 'Jev 审计需要固定模型版本，例如 jev-1.13.0。',
    path: ['model']
  })
export type ForflowModelAccountInput = z.infer<typeof forflowModelAccountInputSchema>
export type ForflowModelAccount = {
  provider: ForflowModelProvider
  state: 'missing' | 'configured' | 'locked'
  model: string | null
}
export type ForflowModelTestResult = {
  ok: boolean
  message: string
  checkedAt: string
}
export type ForflowModelAccountsApi = {
  list: () => Promise<ForflowModelAccount[]>
  save: (input: ForflowModelAccountInput) => Promise<ForflowModelAccount>
  remove: (provider: ForflowModelProvider) => Promise<void>
  test: (provider: ForflowModelProvider) => Promise<ForflowModelTestResult>
}
