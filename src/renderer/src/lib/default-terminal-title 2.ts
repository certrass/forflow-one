import { translate } from '@/i18n/i18n'

/** Keep persisted names and user titles intact; localize the generated display name. */
export function localizeDefaultTerminalTitle(title: string): string {
  const ordinal = /^Terminal (\d+)$/.exec(title)?.[1]
  return ordinal
    ? translate('terminal.defaultTitle', 'Terminal {{index}}', { index: ordinal })
    : title
}
