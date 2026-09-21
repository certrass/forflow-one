import { translate } from '@/i18n/i18n'

export function usageWorkspaceCopy() {
  return {
    reportedTotalsNote: translate(
      'forflow.usageWorkspace.reportedTotalsNote',
      'Totals as recorded by the provider. Empty days have no recorded usage.'
    ),
    navigation: translate('forflow.usageWorkspace.navigation', 'Usage views'),
    overview: translate('forflow.usageWorkspace.overview', 'Overview'),
    analytics: translate('forflow.usageWorkspace.analytics', 'Analytics'),
    review: translate('forflow.usageWorkspace.review', 'Review'),
    history: translate('forflow.usageWorkspace.history', 'Usage history'),
    historyDescription: translate(
      'forflow.usageWorkspace.historyDescription',
      'Explore recorded Codex tokens over time, then open a chat to review its execution.'
    ),
    input: translate('forflow.usageWorkspace.input', 'Uncached input'),
    cached: translate('forflow.usageWorkspace.cached', 'Cached input'),
    output: translate('forflow.usageWorkspace.output', 'Output'),
    tokens: translate('forflow.usageWorkspace.tokens', 'Recorded tokens'),
    tokenTypes: translate('forflow.usageWorkspace.tokenTypes', 'By token type'),
    dailyTotal: translate('forflow.usageWorkspace.dailyTotal', 'Total tokens'),
    chartGrouping: translate('forflow.usageWorkspace.chartGrouping', 'Chart grouping'),
    chartNote: translate(
      'forflow.usageWorkspace.chartNote',
      'Cached input is part of input; reasoning is part of output. Each token is counted once. Empty days have no recorded usage.'
    ),
    chartEmpty: translate('forflow.usageWorkspace.chartEmpty', 'No token records in this period.'),
    topChats: translate('forflow.usageWorkspace.topChats', 'Top chats'),
    chatsDescription: translate(
      'forflow.usageWorkspace.chatsDescription',
      'Compare usage in this period. Expand a chat for models, sources and review.'
    ),
    showMore: translate('forflow.usageWorkspace.showMore', 'Show more'),
    showLess: translate('forflow.usageWorkspace.showLess', 'Show less'),
    sort: translate('forflow.usageWorkspace.sort', 'Sort chats'),
    recent: translate('forflow.usageWorkspace.recent', 'Recently active'),
    highestTokens: translate('forflow.usageWorkspace.highestTokens', 'Most tokens'),
    highestCost: translate('forflow.usageWorkspace.highestCost', 'Highest estimated cost'),
    breakdown: translate('forflow.usageWorkspace.breakdown', 'Usage breakdown'),
    breakdownDescription: translate(
      'forflow.usageWorkspace.breakdownDescription',
      'Share of recorded tokens in the selected scope and period.'
    ),
    byModel: translate('forflow.usageWorkspace.byModel', 'By model'),
    byProject: translate('forflow.usageWorkspace.byProject', 'By project'),
    proportion: translate('forflow.usageWorkspace.proportion', 'Token share'),
    sourceFiles: translate('forflow.usageWorkspace.sourceFiles', 'Log files'),
    priceNote: translate(
      'forflow.usageWorkspace.priceNote',
      'Estimated USD uses known model prices, not credits or a settled bill.'
    ),
    coverage: translate('forflow.usageWorkspace.coverage', 'Data coverage'),
    localRecords: translate(
      'forflow.usageWorkspace.localRecords',
      'Daily tokens, models and chats'
    ),
    connected: translate('forflow.usageWorkspace.connected', 'Local logs connected'),
    planHistory: translate('forflow.usageWorkspace.planHistory', 'Plan usage history'),
    currentOnly: translate(
      'forflow.usageWorkspace.currentOnly',
      'Current limits in Overview; historical periods not connected'
    ),
    toolsAndSkills: translate(
      'forflow.usageWorkspace.toolsAndSkills',
      'Plugins, skills and messages'
    ),
    fragmentsOnly: translate(
      'forflow.usageWorkspace.fragmentsOnly',
      'Tool records available in Review; activity trends not connected'
    ),
    reviewTitle: translate('forflow.usageWorkspace.reviewTitle', 'Session reviews'),
    reviewDescription: translate(
      'forflow.usageWorkspace.reviewDescription',
      'Continue a saved review or select a chat to inspect its records. Findings stay linked to a source version.'
    ),
    enabledTitle: translate('forflow.usageWorkspace.enabledTitle', 'Connect local Codex logs'),
    enabledDescription: translate(
      'forflow.usageWorkspace.enabledDescription',
      'Enable usage tracking to explore chats and review execution records.'
    ),
    enable: translate('forflow.usageWorkspace.enable', 'Enable Codex analytics'),
    scopeNote: translate(
      'forflow.usageWorkspace.scopeNote',
      'Charts follow scope and time. Search and project filters apply to the chat list.'
    ),
    allTime: translate('forflow.usageWorkspace.allTime', 'All'),
    savedVersion: translate('forflow.usageWorkspace.savedVersion', 'Saved versions')
  }
}
