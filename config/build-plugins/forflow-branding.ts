import type { Plugin } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import product from '../../resources/forflow/product.json'

export const forflowBuildEnabled = process.env.FORFLOW_BUILD === '1'

export function forflowBrandingPlugin(enabled = forflowBuildEnabled): Plugin {
  const resourceRoot = fileURLToPath(new URL('../../resources/', import.meta.url))
  const legacyIcons = new Map(
    ['icon.png', 'icon-dev.png', 'app-icons/orca-blue.png', 'app-icons/orca-watercolor.png'].map(
      (asset) => [
        resolve(resourceRoot, asset),
        resolve(resourceRoot, 'forflow/forflow-app-icon.png')
      ]
    )
  )
  legacyIcons.set(
    resolve(resourceRoot, 'logo.svg'),
    resolve(resourceRoot, 'forflow/forflow-mark.png')
  )
  for (const asset of ['tray/orca-menu-barTemplate.png', 'tray/orca-menu-barTemplate@2x.png']) {
    legacyIcons.set(
      resolve(resourceRoot, asset),
      resolve(resourceRoot, 'forflow/forflow-lockup-transparent.png')
    )
  }
  return {
    name: 'forflow-branding',
    enforce: 'pre',
    resolveId(source, importer) {
      const [asset, query] = source.split('?')
      if (
        enabled &&
        importer &&
        source.startsWith('.') &&
        legacyIcons.has(resolve(dirname(importer), asset))
      ) {
        return legacyIcons.get(resolve(dirname(importer), asset)) + (query ? `?${query}` : '')
      }
      return null
    },
    transformIndexHtml(html) {
      return enabled
        ? html.replace(/<title>[^<]*<\/title>/, `<title>${product.name}</title>`)
        : html
    }
  }
}
