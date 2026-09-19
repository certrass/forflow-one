import type { Plugin } from 'vite'

// Monaco evaluates its labels before React mounts. Load its version-matched,
// bundled catalog at the NLS dependency, before any editor contribution runs.
export function forflowLocalizationPlugin(enabled: boolean): Plugin {
  return {
    name: 'forflow-localization',
    enforce: 'pre',
    transform(code, id) {
      if (enabled && id.replaceAll('\\', '/').endsWith('/monaco-editor/esm/vs/nls.messages.js')) {
        return { code: `import '../nls.messages.zh-cn.js';\n${code}`, map: null }
      }
      return null
    }
  }
}
