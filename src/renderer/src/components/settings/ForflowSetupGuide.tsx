import { translate } from '@/i18n/i18n'

export function ForflowSetupGuide(): React.JSX.Element {
  const steps = [
    [
      translate('forflow.guide.accountTitle', '1. 选择本机或企业使用'),
      translate(
        'forflow.guide.accountBody',
        '本机项目可直接使用。团队协作时，在「Forflow 企业账号」填写管理员提供的身份服务地址并登录。账号服务和模型服务分别配置。'
      )
    ],
    [
      translate('forflow.guide.agentTitle', '2. 安装并认证国内智能体'),
      translate(
        'forflow.guide.agentBody',
        '优先选择 CodeBuddy、Qoder CN、TRAE CN、Qwen Code 或 Kimi。按厂商的国内版本说明安装并完成登录，再在「智能体」中检测和选择。厂商账号不会自动转为 Forflow 账号。'
      )
    ],
    [
      translate('forflow.guide.projectTitle', '3. 打开项目并检查权限'),
      translate(
        'forflow.guide.projectBody',
        '添加本地文件夹或 Git 仓库。需要并行修改时创建独立工作区；执行远程任务时先配置 SSH。保留操作确认，先用测试项目验证读取、编辑和终端执行。'
      )
    ],
    [
      translate('forflow.guide.modelTitle', '4. 配置国内或内网模型'),
      translate(
        'forflow.guide.modelBody',
        '在所选智能体中设置企业批准的模型地址、模型名称和凭据。平台账号登录成功不代表模型已开通；先验证一条文本请求，再验证工具调用。不要把密钥提交到代码仓库。'
      )
    ],
    [
      translate('forflow.guide.reviewTitle', '5. 审阅结果和运行记录'),
      translate(
        'forflow.guide.reviewBody',
        '检查文件差异、命令输出和测试结果，再提交代码。管理员可在账号页面查看登录、账号变更与会话撤销记录；业务操作审计还需接入企业运行服务。'
      )
    ],
    [
      translate('forflow.guide.upgradeTitle', '6. 使用经过验证的安装包升级'),
      translate(
        'forflow.guide.upgradeBody',
        '本版采用管理员分发升级。核对版本、校验和与回归记录，备份配置后再安装；上游自动更新、匿名分享和云中继保持关闭。'
      )
    ]
  ]
  return (
    <div className="space-y-6 p-6" data-testid="forflow-setup-guide">
      {steps.map(([title, body]) => (
        <section key={title} className="space-y-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{body}</p>
        </section>
      ))}
    </div>
  )
}
