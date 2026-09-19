import { translate } from '@/i18n/i18n'
import React from 'react'
import type { Editor } from '@tiptap/react'
import EmojiPicker, { Categories, EmojiStyle, Theme, type EmojiClickData } from 'emoji-picker-react'

type RichMarkdownEmojiMenuProps = {
  editor: Editor | null
  left: number
  top: number
  onClose: () => void
}

export function RichMarkdownEmojiMenu({
  editor,
  left,
  top,
  onClose
}: RichMarkdownEmojiMenuProps): React.JSX.Element {
  const insertEmoji = (emojiData: EmojiClickData): void => {
    editor?.chain().focus().insertContent(emojiData.emoji).run()
    onClose()
  }

  return (
    <div className="rich-markdown-emoji-menu" style={{ left, top }} role="dialog">
      <EmojiPicker
        categories={[
          {
            category: Categories.SUGGESTED,
            name: translate('forflow.finalCopy.1e7cf8df9b', 'Recently used')
          },
          {
            category: Categories.SMILEYS_PEOPLE,
            name: translate('forflow.finalCopy.ef1091b54f', 'Smileys and people')
          },
          {
            category: Categories.ANIMALS_NATURE,
            name: translate('forflow.finalCopy.23113fb446', 'Animals and nature')
          },
          {
            category: Categories.FOOD_DRINK,
            name: translate('forflow.finalCopy.d96545f726', 'Food and drink')
          },
          {
            category: Categories.TRAVEL_PLACES,
            name: translate('forflow.finalCopy.3b85e3bf72', 'Travel and places')
          },
          {
            category: Categories.ACTIVITIES,
            name: translate('forflow.finalCopy.4d0076e6b4', 'Activities')
          },
          {
            category: Categories.OBJECTS,
            name: translate('forflow.finalCopy.de5236ee15', 'Objects')
          },
          {
            category: Categories.SYMBOLS,
            name: translate('forflow.finalCopy.9491fc41c3', 'Symbols')
          },
          { category: Categories.FLAGS, name: translate('forflow.finalCopy.f38d9950af', 'Flags') }
        ]}
        autoFocusSearch
        emojiStyle={EmojiStyle.NATIVE}
        height={360}
        lazyLoadEmojis
        onEmojiClick={insertEmoji}
        previewConfig={{ showPreview: false }}
        searchPlaceHolder={translate('forflow.jsxCopy.87fafa7206', 'Search emoji')}
        skinTonesDisabled
        theme={Theme.AUTO}
        width={320}
      />
    </div>
  )
}
