import keys from './slash-command-copy.json'
import { translate } from './i18n'
const descriptionKeys: Readonly<Record<string, string>> = keys

// Only known built-in descriptions are translated. Provider/skill-authored
// descriptions and command tokens remain exactly as received.
export function localizedSlashDescription(value: string): string {
  const key = descriptionKeys[value]
  return key ? translate(key, value) : value
}
