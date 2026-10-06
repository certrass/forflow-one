import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { feishuProfileSchema } from '../../../../shared/forflow-feishu'

export function ForflowFeishuSetup({
  profile,
  onProfileChange,
  installed,
  busy
}: {
  profile: string
  onProfileChange: (profile: string) => void
  installed: boolean
  busy: boolean
}): React.JSX.Element {
  const validated = feishuProfileSchema.safeParse(profile.trim())
  const command = validated.success ? `lark-cli --profile ${validated.data}` : 'lark-cli'
  const steps = [
    {
      title: '安装连接工具',
      description: '在系统终端运行一次，之后由 Forflow One 调用。',
      command: 'npm install -g @larksuite/cli',
      done: installed
    },
    {
      title: '选择飞书应用',
      description: '按提示使用已有应用，或创建一个用于读取任务的应用。',
      command: 'lark-cli config init',
      done: false
    },
    {
      title: '登录并授权',
      description: '按提示在飞书确认任务读取权限，再回到这里点击“连接飞书”。',
      command: `${command} auth login --scope "task:task:read task:tasklist:read offline_access"`,
      done: false
    }
  ]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        首次使用需要完成以下设置。已有授权可直接连接。
      </p>
      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="space-y-2">
            <p className="text-sm font-medium">
              {index + 1}. {step.title}
              {step.done ? ' · 已安装' : ''}
            </p>
            {!step.done ? (
              <>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                <div className="flex items-start gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-md bg-muted p-3 text-xs">
                    {step.command}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`复制${step.title}命令`}
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(step.command)
                        .then(() => toast.success('命令已复制'))
                        .catch(() => toast.error('复制失败，请选择命令手动复制。'))
                    }}
                  >
                    复制命令
                  </Button>
                </div>
              </>
            ) : null}
          </li>
        ))}
      </ol>
      <details>
        <summary className="cursor-pointer text-sm">使用其他飞书应用</summary>
        <label className="mt-3 block space-y-2 text-sm">
          应用 ID
          <Input
            value={profile}
            onChange={(event) => onProfileChange(event.target.value)}
            placeholder="cli_…"
            autoComplete="off"
            disabled={busy}
            aria-invalid={Boolean(profile.trim()) && !validated.success}
          />
          <span className="block text-xs text-muted-foreground">
            留空使用当前应用。填写后，授权命令会使用所选应用。
          </span>
        </label>
      </details>
      <Button
        variant="link"
        size="sm"
        onClick={() => void window.api.shell.openUrl('https://github.com/larksuite/cli')}
      >
        查看官方设置说明
      </Button>
    </div>
  )
}
