import type { Plugin } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import product from '../../resources/forflow/product.json'

export const forflowBuildEnabled = process.env.FORFLOW_BUILD === '1'

export function forflowBrandingPlugin(): Plugin {
  const resourceRoot = fileURLToPath(new URL('../../resources/', import.meta.url))
  return {
    name: 'forflow-branding',
    enforce: 'pre',
    resolveId(source, importer) {
      if (
        forflowBuildEnabled &&
        importer &&
        source.startsWith('.') &&
        resolve(dirname(importer), source) === resolve(resourceRoot, 'logo.svg')
      ) {
        return resolve(resourceRoot, 'forflow/forflow-mark.png')
      }
      return null
    },
    transformIndexHtml(html) {
      return forflowBuildEnabled
        ? html.replace(/<title>[^<]*<\/title>/, `<title>${product.name}</title>`)
        : html
    }
  }
}
