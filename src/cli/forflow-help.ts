import type { CommandSpec } from './command-spec'
import { brandCliDocumentation, isForflowCli } from './cli-product'
import { FORFLOW_COMMAND_SUMMARIES } from './forflow-command-summaries'

export function cliSpecPresentation(spec: CommandSpec): CommandSpec {
  if (!isForflowCli()) return spec
  const offlineSkills = ['skills install', 'skills update'].includes(spec.path.join(' '))
  return {
    ...spec,
    summary: FORFLOW_COMMAND_SUMMARIES[spec.path.join(' ')] ?? brandCliDocumentation(spec.summary),
    usage: brandCliDocumentation(spec.usage),
    notes: offlineSkills
      ? [
          '直接使用当前安装包内的技能，不调用 npx，不下载第三方代码。',
          '默认安装到用户的 .agents/skills 共享目录；--local 安装到当前项目。',
          '--agent 仅支持 universal；旧技能名称作为兼容别名保留。',
          '--dry-run 只预览，不写文件；实际安装也支持 --json。',
          'update 只更新已安装的技能；本地修改或外部符号链接存在冲突时保留原内容。',
          'SSH 转发入口不执行本机安装；请在目标机器直接运行该命令。',
          '不传 --skill 或 --all 时列出可用技能。'
        ]
      : spec.notes?.map(brandCliDocumentation),
    examples: offlineSkills
      ? [
          `forflow skills ${spec.path[1]} --skill forflow-cli --skill orchestration`,
          `forflow skills ${spec.path[1]} --all --dry-run`,
          `forflow skills ${spec.path[1]} --skill forflow-cli --local --json`
        ]
      : spec.examples?.map(brandCliDocumentation)
  }
}

export function formatForflowRootHelp(specs: CommandSpec[]): string {
  return [
    'Forflow One 命令行 · forflow',
    '',
    '用法：forflow <command> [options]',
    '查看版本：forflow --version',
    '',
    '命令：',
    ...specs
      .filter((spec) => !spec.hidden)
      .map((spec) => `  ${spec.path.join(' ').padEnd(38)} ${cliSpecPresentation(spec).summary}`),
    '',
    '查看详细用法：forflow <command> --help',
    '供智能体读取的完整命令定义：forflow agent-context --json',
    '',
    '开始使用：',
    '  forflow open',
    '  forflow status --json',
    '  forflow repo list',
    '  forflow worktree create --name agent-task --agent codex --prompt "检查项目"',
    '  forflow terminal create --worktree active --command "codex"',
    '  forflow skills list',
    '  forflow skills get forflow-cli',
    '',
    '目标选择：',
    '  --repo <selector>       id:<id>、name:<name> 或 path:<path>',
    '  --worktree <selector>   active/current、identity:<id>、branch:<branch> 或 path:<path>',
    '  --terminal <handle>     使用 forflow terminal list --json 返回的句柄',
    '  --environment <name>    使用已保存的远程环境；先运行 forflow environment list',
    '  --pairing-code <code>   使用服务器实际给出的配对码，兼容 orca://pair 协议',
    '',
    '终端操作：',
    '  forflow terminal list --worktree active --json',
    '  forflow terminal send --terminal <handle> --text "检查项目" --enter',
    '  forflow terminal wait --terminal <handle> --for exit --timeout-ms 60000 --json',
    '  --wait-submit <seconds> 仅观察已接受的输入，不重复发送',
    '  --retry-request <id>    在响应不确定时复用原请求 ID',
    '  --include-visual-layouts 在 JSON 中包含标签和窗格结构',
    '',
    '浏览器操作：',
    '  1. forflow tab create --url https://example.com',
    '  2. forflow snapshot',
    '  3. forflow click --element e2',
    '     forflow fill --element e5 --value "搜索内容"',
    '     forflow keypress --key Enter',
    '  4. 页面变化后重新运行 forflow snapshot，再选择新的元素引用。',
    '  并行操作先用 forflow tab list --json 获取 browserPageId，后续指定 --page <id>。',
    '',
    '环境变量：',
    '  FORFLOW_USER_DATA_PATH  指定 Forflow One 数据目录',
    '  FORFLOW_ENVIRONMENT    指定已保存的远程环境',
    '  FORFLOW_PAIRING_CODE   指定远程配对码',
    '  FORFLOW_APP_EXECUTABLE 指定应用程序路径',
    '  同名 ORCA_* 变量作为兼容入口保留；FORFLOW_* 优先。',
    '',
    '多数操作需要运行中的 Forflow One；尚未启动时先执行 forflow open。',
    '命令与参数名保持英文，JSON 字段及远程协议保持兼容。',
    'account 管理 Claude/Codex 登录；Kimi、智谱和 DeepSeek API Key 在应用的“AI 提供商账户”中管理。'
  ].join('\n')
}
