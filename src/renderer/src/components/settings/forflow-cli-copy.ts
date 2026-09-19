import type { CliInstallStatus } from '../../../../shared/cli-install-types'
import { translate } from '@/i18n/i18n'

export function forflowCliStatusDescription(status: CliInstallStatus | null): string {
  if (!status) {
    return translate('forflow.cli.loading', '正在读取命令注册状态。')
  }
  switch (status.state) {
    case 'installed':
      return status.pathConfigured
        ? translate('forflow.cli.installed', '命令已注册，可在终端使用 forflow。')
        : translate(
            'forflow.cli.pathMissing',
            '命令已注册，但当前终端尚未识别 PATH；请重启终端或检查环境变量。'
          )
    case 'not_installed':
      return translate('forflow.cli.register', '注册 {{path}} 后，可从终端使用 Forflow One。', {
        path: status.commandPath ?? 'forflow'
      })
    case 'stale':
      return translate('forflow.cli.stale', '现有命令指向旧版本，请重新注册并核对目标路径。')
    case 'conflict':
      return translate('forflow.cli.conflict', '命令路径已被其他文件占用，请先检查冲突文件。')
    case 'unsupported':
      return translate(
        'forflow.cli.unsupported',
        '当前运行方式不支持注册命令，请使用完整安装包或联系管理员。'
      )
  }
}
