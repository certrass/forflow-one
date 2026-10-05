import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setRendererUiLanguage } from '@/i18n/i18n'
import { SearchResultsPane } from './SearchResultsPane'
import { buildSearchRows } from './search-rows'
import type { SearchResult } from '../../../../shared/code-search-types'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({ getTotalSize: () => 0, getVirtualItems: () => [] })
}))

function renderSummary(count: number, files: number): string {
  const results: SearchResult = {
    totalMatches: count,
    truncated: false,
    files: Array.from({ length: files }, (_, index) => ({
      filePath: `/project/file${index}.txt`,
      relativePath: `file${index}.txt`,
      matches: []
    }))
  }
  return renderToStaticMarkup(
    <SearchResultsPane
      results={results}
      hasCommittedResults
      query="task"
      loading={false}
      rows={buildSearchRows(results, new Set())}
      scrollRef={{ current: null }}
      onToggleCollapsedFile={() => {}}
      onMatchClick={() => {}}
    />
  )
}

describe('search result count localization', () => {
  afterEach(() => setRendererUiLanguage('en'))

  it('renders complete Chinese wording without English plural suffixes', async () => {
    await setRendererUiLanguage('zh')
    expect(renderSummary(2, 2)).toContain('在 2 个文件中找到 2 个结果')
    expect(renderSummary(1, 1)).toContain('在 1 个文件中找到 1 个结果')
  })

  it('keeps independent English singular and plural counts', async () => {
    await setRendererUiLanguage('en')
    expect(renderSummary(1, 1)).toContain('1 result in 1 file')
    expect(renderSummary(2, 1)).toContain('2 results in 1 file')
    expect(renderSummary(2, 2)).toContain('2 results in 2 files')
  })
})
