export const FORFLOW_BUNDLED_SKILLS = {
  'orca-cli': '通过 Forflow One 命令行管理项目、工作区、终端与内置浏览器。',
  'computer-use': '通过 Forflow One 使用经过系统授权的电脑操作能力。',
  orchestration: '在 Forflow One 中管理多智能体任务、消息与决策。',
  'orca-linear': '连接并处理已由用户配置的 Linear 任务。',
  'linear-tickets': '阅读与更新已授权的 Linear 工单。',
  'orca-per-workspace-env': '为工作区配置独立执行环境。',
  'orca-emulator': '通过 Forflow One 操作本机移动设备模拟器。',
  'orca-emulator-android': '通过 Forflow One 操作本机 Android 模拟器。'
} as const

export type ForflowBundledSkillResult = { name: string; status: string; path?: string }
export type ForflowSkillsApi = {
  installBundled(names: string[]): Promise<ForflowBundledSkillResult[]>
}
