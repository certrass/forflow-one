import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import {
  FORFLOW_BUNDLED_SKILLS,
  type ForflowBundledSkillResult
} from '../../shared/forflow-bundled-skills'
import { createSkillPackageArchive } from '../skills/skill-package-creation'
import { installSharedSkill } from '../skills/skill-install-service'

const namesSchema = z
  .array(
    z.custom<keyof typeof FORFLOW_BUNDLED_SKILLS>(
      (value) => typeof value === 'string' && Object.hasOwn(FORFLOW_BUNDLED_SKILLS, value)
    )
  )
  .min(1)
  .max(8)

export async function installForflowBundledSkills(input: {
  names: unknown
  homeDirectory: string
  stateDirectory: string
  version: string
  launcherPath: string
}): Promise<ForflowBundledSkillResult[]> {
  const names = [...new Set(namesSchema.parse(input.names))]
  const temporary = await mkdtemp(join(tmpdir(), 'forflow-bundled-skills-'))
  const results: ForflowBundledSkillResult[] = []
  try {
    for (const name of names) {
      const source = join(temporary, name)
      await mkdir(source)
      // The executable serves version-matched guides; no downloaded code or install scripts.
      await writeFile(
        join(source, 'SKILL.md'),
        [
          '---',
          `name: ${name}`,
          `description: ${FORFLOW_BUNDLED_SKILLS[name]}`,
          '---',
          '',
          '# Forflow One 内置技能',
          '',
          `版本：${input.version}。本技能从应用安装包离线安装。`,
          '',
          `本机命令行位置：${JSON.stringify(input.launcherPath)}。`,
          `先使用该程序执行 skills get ${name}，按需添加 --json 或 --references。`,
          '后续指南中的 ORCA、orca 命令均使用上述 Forflow One 程序；不要启动其他安装的 Orca。',
          '只操作用户授权的目标，遵守权限和上传确认。云端服务未配置时不得自动回退到其他供应商。',
          '执行失败时报告实际错误，不下载替代技能或绕过确认。',
          ''
        ].join('\n')
      )
      const pack = await createSkillPackageArchive({
        sourceDirectory: source,
        archivePath: join(temporary, `${name}.tar.gz`),
        packageId: `forflow-bundled-${name}`,
        versionId: createHash('sha256').update(input.version).digest('hex')
      })
      const result = await installSharedSkill({
        operationId: randomUUID(),
        archivePath: pack.archivePath,
        expectedArchiveSha256: pack.archiveSha256,
        expectedPackageDigest: pack.manifest.packageDigest,
        expectedPackageId: pack.manifest.packageId,
        expectedVersionId: pack.manifest.versionId,
        scope: 'global',
        homeDirectory: input.homeDirectory,
        orcaStateDirectory: input.stateDirectory,
        detectedProviders: [],
        destinationIdentity: 'forflow-local-shared-skills',
        hostIdentity: 'local',
        conflictResolution: 'replace-unmodified'
      })
      results.push({ name, status: result.status, path: result.canonicalPath })
    }
    return results
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}
