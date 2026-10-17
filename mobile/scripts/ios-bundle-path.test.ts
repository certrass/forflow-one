import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../plugins/with-ios-bundle-path.js', import.meta.url), 'utf8')
type Phase = { shellScript: string }
type Mod = {
  modResults: {
    hash: { project: { objects: { PBXShellScriptBuildPhase: Record<string, Phase> } } }
  }
}

function applyPlugin(phases: Record<string, Phase>) {
  const module = { exports: (mod: Mod) => mod }
  runInNewContext(source, {
    module,
    require: () => ({ withXcodeProject: (mod: Mod, action: (value: Mod) => Mod) => action(mod) })
  })
  const mod = {
    modResults: { hash: { project: { objects: { PBXShellScriptBuildPhase: phases } } } }
  }
  module.exports(mod)
}

describe('iOS bundle script path', () => {
  const command =
    "`\"$NODE_BINARY\" --print \"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\"`"

  it.each(['escaped', 'literal'] as const)(
    'quotes the resolved script with %s control characters',
    (encoding) => {
      const script = `export PROJECT_ROOT="$PROJECT_DIR/.."\n\t${command}\n`
      const encoded = JSON.stringify(script)
      const phase = {
        shellScript:
          encoding === 'literal' ? encoded.replace(/\\n/g, '\n').replace(/\\t/g, '\t') : encoded
      }
      applyPlugin({ bundle: phase })
      expect(JSON.parse(phase.shellScript)).toBe(
        script.replace(command, `/bin/bash "$(${command.slice(1, -1)})"`)
      )
      const once = phase.shellScript
      applyPlugin({ bundle: phase })
      expect(phase.shellScript).toBe(once)
    }
  )

  it('leaves unrelated plugin scripts unchanged even before they are JSON escaped', () => {
    const phase = { shellScript: '"echo first\necho second"' }
    applyPlugin({ unrelated: phase })
    expect(phase.shellScript).toBe('"echo first\necho second"')
  })
})
