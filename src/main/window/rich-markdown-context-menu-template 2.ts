import {
  richMarkdownContextMenuCommandChannel,
  type RichMarkdownContextMenuCommand,
  type RichMarkdownContextMenuCommandPayload,
  type RichMarkdownContextMenuTableTarget
} from '../../shared/rich-markdown-context-menu'
import { translateMain } from '../i18n/main-i18n'
import type { EditableContextMenuWebContents } from './editable-context-menu'

function markdownCommandItem(
  label: string,
  command: RichMarkdownContextMenuCommand,
  webContents: EditableContextMenuWebContents,
  point: { x: number; y: number },
  tableTargetId?: string
): Electron.MenuItemConstructorOptions {
  return {
    label,
    click: () => {
      const payload: RichMarkdownContextMenuCommandPayload = {
        command,
        ...point,
        ...(tableTargetId ? { tableTargetId } : {})
      }
      webContents.send(richMarkdownContextMenuCommandChannel, payload)
    }
  }
}

export function buildMarkdownMenuTemplate(
  webContents: EditableContextMenuWebContents,
  point: { x: number; y: number },
  tableTarget: RichMarkdownContextMenuTableTarget | null,
  editItems: Electron.MenuItemConstructorOptions[]
): Electron.MenuItemConstructorOptions[] {
  return [
    markdownCommandItem(
      translateMain('forflow.nativeMenu.dfe9ca4d0f', 'Add link'),
      'add-link',
      webContents,
      point
    ),
    { type: 'separator' },
    {
      label: translateMain('forflow.nativeMenu.2f343666aa', 'Format'),
      submenu: [
        markdownCommandItem(
          translateMain('forflow.nativeMenu.94fee62e68', 'Bold'),
          'bold',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.9bf37cb58a', 'Italic'),
          'italic',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.92c872eb9e', 'Strike'),
          'strike',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.e767deee63', 'Inline code'),
          'inline-code',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.7545380a29', 'Code block'),
          'code-block',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.eb4cdebd82', 'Quote'),
          'blockquote',
          webContents,
          point
        )
      ]
    },
    {
      label: translateMain('forflow.nativeMenu.c3b03dd285', 'Paragraph'),
      submenu: [
        markdownCommandItem(
          translateMain('forflow.nativeMenu.751f5ed0ea', 'Body text'),
          'paragraph',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.d95e9370ef', 'Heading 1'),
          'heading-1',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.3291955e90', 'Heading 2'),
          'heading-2',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.c6845f11c2', 'Heading 3'),
          'heading-3',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.df78f14225', 'Heading 4'),
          'heading-4',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.8b9c54a41e', 'Heading 5'),
          'heading-5',
          webContents,
          point
        ),
        { type: 'separator' },
        markdownCommandItem(
          translateMain('forflow.nativeMenu.a2b5baef0f', 'Bullet list'),
          'bullet-list',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.cc62f6c7b2', 'Numbered list'),
          'ordered-list',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.7346030400', 'Checklist'),
          'task-list',
          webContents,
          point
        )
      ]
    },
    {
      label: translateMain('forflow.nativeMenu.8aa318eb7e', 'Insert'),
      submenu: [
        markdownCommandItem(
          translateMain('forflow.nativeMenu.a6a32dbc56', 'Link'),
          'add-link',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.1aa4cb0bcc', 'Image'),
          'image',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.cc29053ff4', 'Divider'),
          'divider',
          webContents,
          point
        ),
        markdownCommandItem(
          translateMain('forflow.nativeMenu.7545380a29', 'Code block'),
          'code-block',
          webContents,
          point
        )
      ]
    },
    ...(tableTarget
      ? [
          {
            label: translateMain('auto.main.window.editableContextMenu.table', 'Table'),
            submenu: [
              {
                ...markdownCommandItem(
                  translateMain(
                    'auto.main.window.editableContextMenu.insertRowAbove',
                    'Insert row above'
                  ),
                  'insert-row-above',
                  webContents,
                  point,
                  tableTarget.targetId
                ),
                enabled: tableTarget.cellType !== 'header'
              },
              markdownCommandItem(
                translateMain(
                  'auto.main.window.editableContextMenu.insertRowBelow',
                  'Insert row below'
                ),
                'insert-row-below',
                webContents,
                point,
                tableTarget.targetId
              ),
              {
                ...markdownCommandItem(
                  translateMain('auto.main.window.editableContextMenu.deleteRow', 'Delete row'),
                  'delete-row',
                  webContents,
                  point,
                  tableTarget.targetId
                ),
                enabled: tableTarget.cellType !== 'header'
              },
              { type: 'separator' as const },
              markdownCommandItem(
                translateMain(
                  'auto.main.window.editableContextMenu.insertColumnLeft',
                  'Insert column left'
                ),
                'insert-column-left',
                webContents,
                point,
                tableTarget.targetId
              ),
              markdownCommandItem(
                translateMain(
                  'auto.main.window.editableContextMenu.insertColumnRight',
                  'Insert column right'
                ),
                'insert-column-right',
                webContents,
                point,
                tableTarget.targetId
              ),
              markdownCommandItem(
                translateMain('auto.main.window.editableContextMenu.deleteColumn', 'Delete column'),
                'delete-column',
                webContents,
                point,
                tableTarget.targetId
              ),
              { type: 'separator' as const },
              markdownCommandItem(
                translateMain('auto.main.window.editableContextMenu.deleteTable', 'Delete table'),
                'delete-table',
                webContents,
                point,
                tableTarget.targetId
              )
            ]
          }
        ]
      : []),
    { type: 'separator' },
    ...editItems
  ]
}
