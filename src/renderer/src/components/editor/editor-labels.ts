import { translate } from '@/i18n/i18n'
import type { OpenFile } from '@/store/slices/editor'
import { basename } from '@/lib/path'

type EditorLabelVariant = 'fileName' | 'relativePath' | 'fullPath'

function getBaseLabel(file: OpenFile, variant: EditorLabelVariant): string {
  switch (variant) {
    case 'fullPath':
      return file.filePath
    case 'relativePath':
      return file.relativePath
    case 'fileName':
      return basename(file.relativePath)
  }
}

const DIFF_SOURCE_LABELS: Record<string, string> = {
  staged: 'staged diff',
  unstaged: 'diff',
  branch: 'branch diff',
  commit: 'commit diff'
}

export function getEditorDisplayLabel(
  file: OpenFile,
  variant: EditorLabelVariant = 'fileName'
): string {
  if (file.mode === 'conflict-review') {
    return translate('forflow.desktopCopy.d4985f0994', 'Conflict Review')
  }

  if (file.mode === 'check-details') {
    return file.checkRunDetails?.check.name ?? getBaseLabel(file, variant)
  }

  if (file.mode === 'markdown-preview') {
    return translate('forflow.dynamicCopy.a316c30a4d', '{{value0}} (preview)', {
      value0: getBaseLabel(file, variant)
    })
  }

  if (file.mode !== 'diff') {
    return getBaseLabel(file, variant)
  }

  const source = file.diffSource
  if (source === 'combined-all') {
    return translate('forflow.desktopCopy.b3b853ceef', 'All Changes')
  }
  if (source === 'combined-uncommitted') {
    return file.combinedAreaFilter
      ? getBaseLabel(file, variant)
      : translate('forflow.finalCopy.0d0b429062', 'Uncommitted Changes')
  }
  if (source === 'combined-branch') {
    return translate('forflow.dynamicCopy.970579ffd9', 'Branch Changes ({{value0}})', {
      value0: file.branchCompare?.baseRef ?? translate('forflow.finalCopy.cae662172f', 'base')
    })
  }
  if (source === 'combined-commit') {
    return file.commitCompare?.subject
      ? translate('forflow.finalCopy.12ca65f754', 'Commit {{ref}}: {{subject}}', {
          ref: file.commitCompare.compareRef,
          subject: file.commitCompare.subject
        })
      : translate('forflow.finalCopy.4e4ea8cb73', 'Commit {{ref}}', {
          ref: file.commitCompare?.compareRef ?? ''
        })
  }

  const baseLabel = getBaseLabel(file, variant)
  const suffix = translate(
    `forflow.diffSource.${source ?? 'unstaged'}`,
    (source && DIFF_SOURCE_LABELS[source]) ?? 'diff'
  )
  return `${baseLabel} (${suffix})`
}
