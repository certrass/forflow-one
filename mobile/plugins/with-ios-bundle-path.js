const { withXcodeProject } = require('expo/config-plugins')

const resolveBundleScript = `"$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'"`

module.exports = function withIosBundlePath(config) {
  return withXcodeProject(config, (mod) => {
    const phases = mod.modResults.hash.project.objects.PBXShellScriptBuildPhase
    for (const phase of Object.values(phases)) {
      if (!phase || typeof phase !== 'object' || typeof phase.shellScript !== 'string') {
        continue
      }
      const script = JSON.parse(phase.shellScript)
      if (!script.includes(`\`${resolveBundleScript}\``)) {
        continue
      }
      // Expo's template executes this path unquoted, splitting checkout names with spaces.
      phase.shellScript = JSON.stringify(
        script.replace(`\`${resolveBundleScript}\``, `/bin/bash "$(${resolveBundleScript})"`)
      )
    }
    return mod
  })
}
