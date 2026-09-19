import { buildMarkdownMenuTemplate } from './rich-markdown-context-menu-template'
import type { RichMarkdownContextMenuTableTarget } from '../../shared/rich-markdown-context-menu'
import { translateMain } from '../i18n/main-i18n'

export type EditableContextMenuWebContents = Pick<
  Electron.WebContents,
  'replaceMisspelling' | 'send' | 'session'
>

function editableContextPasteItem(
  label: string,
  webContents: EditableContextMenuWebContents,
  options?: { plainTextOnly?: boolean }
): Electron.MenuItemConstructorOptions {
  return {
    label,
    click: () => {
      // Why: context-menu paste must share renderer ownership with keyboard and
      // app-menu paste so large text controls can chunk and terminals cannot
      // receive duplicate native paste.
      webContents.send('ui:editableContextPaste', {
        plainTextOnly: options?.plainTextOnly === true
      })
    }
  }
}

export function buildNativeEditMenuTemplate(
  webContents: EditableContextMenuWebContents
): Electron.MenuItemConstructorOptions[] {
  return [
    { role: 'cut', label: translateMain('forflow.nativeMenu.1f45f02561', 'Cut') },
    { role: 'copy', label: translateMain('forflow.nativeMenu.e21f935f11', 'Copy') },
    editableContextPasteItem(translateMain('forflow.nativeMenu.f3380f7b44', 'Paste'), webContents),
    editableContextPasteItem(
      translateMain('forflow.nativeMenu.c95c567f5b', 'Paste as plain text'),
      webContents,
      { plainTextOnly: true }
    ),
    { role: 'selectAll', label: translateMain('forflow.nativeMenu.1fc9a38765', 'Select all') }
  ]
}

export function buildEditableContextMenuTemplate(
  params: Electron.ContextMenuParams,
  webContents: EditableContextMenuWebContents,
  options?: { tableTarget?: RichMarkdownContextMenuTableTarget | null }
): Electron.MenuItemConstructorOptions[] {
  if (!params.isEditable) {
    return []
  }

  const suggestions = params.dictionarySuggestions.slice(0, 5)
  const isRichMarkdownSurface = params.formControlType === 'none'
  const template: Electron.MenuItemConstructorOptions[] = suggestions.map((suggestion) => ({
    label: suggestion,
    click: () => webContents.replaceMisspelling(suggestion)
  }))

  if (params.misspelledWord) {
    if (template.length > 0) {
      template.push({ type: 'separator' })
    }
    template.push({
      label: translateMain('forflow.nativeMenu.b0f5bc4d99', 'Add to dictionary'),
      click: () => {
        webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      }
    })
  }

  if (template.length > 0) {
    template.push({ type: 'separator' })
  }
  template.push(
    ...(isRichMarkdownSurface
      ? buildMarkdownMenuTemplate(
          webContents,
          { x: params.x, y: params.y },
          options?.tableTarget ?? null,
          buildNativeEditMenuTemplate(webContents)
        )
      : buildNativeEditMenuTemplate(webContents))
  )

  return template
}

export function parseRichMarkdownContextMenuTableTarget(
  value: unknown
): RichMarkdownContextMenuTableTarget | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const target = value as Partial<RichMarkdownContextMenuTableTarget>
  if (
    (target.cellType !== 'body' && target.cellType !== 'header') ||
    typeof target.targetId !== 'string' ||
    target.targetId.length === 0 ||
    typeof target.x !== 'number' ||
    !Number.isFinite(target.x) ||
    typeof target.y !== 'number' ||
    !Number.isFinite(target.y)
  ) {
    return null
  }
  return {
    cellType: target.cellType,
    targetId: target.targetId,
    x: target.x,
    y: target.y
  }
}

export function matchingRichMarkdownContextMenuTableTarget(
  params: Electron.ContextMenuParams,
  target: RichMarkdownContextMenuTableTarget | null
): RichMarkdownContextMenuTableTarget | null {
  if (
    !target ||
    !params.isEditable ||
    params.formControlType !== 'none' ||
    params.x !== target.x ||
    params.y !== target.y
  ) {
    return null
  }
  return target
}
