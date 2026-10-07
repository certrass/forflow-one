import type { TuiAgent } from '../../../shared/tui-agent'

export type AgentCatalogEntry = {
  id: TuiAgent
  label: string
  /** Default CLI binary name used for PATH detection. */
  cmd: string
  searchAliases?: readonly string[]
  /** Direct or bundled image URL for agents whose project identity is not represented by a favicon service. */
  iconUrl?: string
  /** Domain for Google's favicon service — used for agents without an SVG icon. */
  faviconDomain?: string
  /** Homepage/install docs URL, sourced from the README agent badge list. */
  homepageUrl: string
}
