import { describe, expect, it } from 'vitest'
import { build } from 'vite'
import { forflowBrandingPlugin } from '../build-plugins/forflow-branding'
import { forflowLocalizationPlugin } from '../build-plugins/forflow-localization'
import { resolve } from 'node:path'

describe('Forflow build asset and editor localization', () => {
  it('redirects every legacy application icon, including tray assets and import queries', async () => {
    const sources = [
      'logo.svg',
      'icon.png',
      'icon-dev.png',
      'app-icons/orca-blue.png',
      'app-icons/orca-watercolor.png',
      'tray/orca-menu-barTemplate.png',
      'tray/orca-menu-barTemplate@2x.png'
    ]
    const seen: string[] = []
    await build({
      configFile: false,
      logLevel: 'silent',
      plugins: [
        forflowBrandingPlugin(true),
        {
          name: 'icon-test-entry',
          enforce: 'pre',
          resolveId(id) {
            if (id === 'virtual:icons') {
              return id
            }
          },
          load(id) {
            if (id === 'virtual:icons') {
              return sources
                .map(
                  (source, i) =>
                    `import icon${i} from ${JSON.stringify(`./resources/${source}?asset&asarUnpack`)}; console.log(icon${i});`
                )
                .join('\n')
            }
            if (id.includes('/resources/forflow/')) {
              seen.push(id)
              return 'export default "forflow-image"'
            }
          }
        }
      ],
      build: { write: false, minify: false, rollupOptions: { input: 'virtual:icons' } }
    })
    expect(seen).toEqual(
      expect.arrayContaining([
        `${resolve('resources/forflow/forflow-mark.png')}?asset&asarUnpack`,
        `${resolve('resources/forflow/forflow-app-icon.png')}?asset&asarUnpack`,
        `${resolve('resources/forflow/forflow-lockup-transparent.png')}?asset&asarUnpack`
      ])
    )
  })

  it('loads bundled Chinese Monaco messages only for Forflow builds', async () => {
    for (const enabled of [true, false]) {
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        plugins: [forflowLocalizationPlugin(enabled)],
        build: {
          write: false,
          minify: false,
          lib: {
            entry: resolve('node_modules/monaco-editor/esm/vs/nls.messages.js'),
            formats: ['es']
          },
          rollupOptions: { output: { entryFileNames: 'nls.js' } }
        }
      })
      const outputs = Array.isArray(result) ? result : [result]
      const code = outputs
        .flatMap((output) => ('output' in output ? output.output : []))
        .filter((item) => item.type === 'chunk')
        .map((item) => item.code)
        .join('\n')
      expect(code.includes('_VSCODE_NLS_LANGUAGE = "zh-cn"')).toBe(enabled)
    }
  })
})
