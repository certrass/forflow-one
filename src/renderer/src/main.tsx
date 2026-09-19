// Why first, and why the import-free shim: react-dom reads
// __REACT_DEVTOOLS_GLOBAL_HOOK__ once at module evaluation, so the global has to
// exist before it. The observer below only wraps a property react-dom re-reads
// per commit, so its own import graph can evaluate whenever it likes.
import './lib/react-devtools-commit-hook-shim'
import './lib/react-commit-cascade-observer'
import './assets/main.css'

import { StrictMode } from 'react'
import { useTranslation } from 'react-i18next'
import App from './App'
import { RecoverableRenderErrorBoundary } from './components/error-boundaries/RecoverableRenderErrorBoundary'
import {
  installRendererCrashDiagnostics,
  recordRendererCrashBreadcrumb
} from './lib/crash-diagnostics'
import { installAutomationHostDiagnostic } from './components/automations/automation-host-diagnostics'
import { applyDocumentTheme } from './lib/document-theme'
import { installTypingLatencyDiagnostic } from './lib/typing-latency/diagnostic'
import { shouldEnableReactGrab } from './lib/react-grab-dev-gate'
import { I18nProvider } from './i18n/I18nProvider'
import { translate, setRendererUiLanguage } from './i18n/i18n'
import { isForflowBuild } from '../../shared/product-branding'
import { getOrCreateRendererRoot } from './lib/react-renderer-root'
import { primeTerminalWebglAddon } from './lib/pane-manager/pane-webgl-renderer'
import { SkillWarningPreviewLauncher } from './components/skills/SkillWarningPreviewLauncher'
import { installBrowserClientPageRenderer } from './components/browser-pane/browser-client-page-renderer-installation'

recordRendererCrashBreadcrumb('renderer_bootstrap_started', { dev: import.meta.env.DEV })
installRendererCrashDiagnostics()
installTypingLatencyDiagnostic()
installAutomationHostDiagnostic()

if (
  import.meta.env.DEV &&
  shouldEnableReactGrab({
    dev: import.meta.env.DEV,
    enableFlag: import.meta.env.VITE_ENABLE_REACT_GRAB
  })
) {
  void import('react-grab').then(({ init }) => init())
  void import('react-grab/styles.css')
}

applyDocumentTheme('system', { disableTransitions: false })
const browserClientPageRenderer = installBrowserClientPageRenderer()
import.meta.hot?.dispose(() => browserClientPageRenderer?.dispose())

const rootElement = document.getElementById('root')
if (!rootElement) {
  recordRendererCrashBreadcrumb('renderer_root_missing')
  throw new Error('Renderer root element not found.')
}

function RendererRoot(): React.JSX.Element {
  useTranslation()
  return (
    <RecoverableRenderErrorBoundary
      boundaryId="app.root"
      surface="app-root"
      title={translate('app.recoverableError.rootTitle', 'Orca hit a renderer error.')}
      description={translate(
        'app.recoverableError.rootDescription',
        'The app shell could not finish rendering. Retry to remount it, or relaunch Orca if the error persists.'
      )}
    >
      <App />
      <SkillWarningPreviewLauncher />
    </RecoverableRenderErrorBoundary>
  )
}

async function renderApplication(): Promise<void> {
  if (isForflowBuild()) {
    await setRendererUiLanguage('zh')
  }
  if (!rootElement) {
    return
  }
  getOrCreateRendererRoot(rootElement, import.meta.hot?.data).render(
    <StrictMode>
      <I18nProvider>
        <RendererRoot />
      </I18nProvider>
    </StrictMode>
  )
  recordRendererCrashBreadcrumb('renderer_bootstrap_rendered')
  void primeTerminalWebglAddon()
}

void renderApplication().catch((error) => {
  rootElement.textContent = '无法加载界面，请重启 Forflow One。'
  console.error('Renderer initialization failed', error)
})
