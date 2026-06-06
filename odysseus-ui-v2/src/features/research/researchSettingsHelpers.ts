export const RESEARCH_CATEGORIES = [
  { id: '', label: 'Auto', title: 'LLM auto-detects the best format' },
  { id: 'product', label: 'Product' },
  { id: 'comparison', label: 'Compare' },
  { id: 'howto', label: 'How-to' },
  { id: 'factcheck', label: 'Fact-check' },
] as const

export const RESEARCH_SEARCH_PROVIDERS = [
  { id: '', label: 'Default' },
  { id: 'searxng', label: 'SearXNG' },
  { id: 'brave', label: 'Brave' },
  { id: 'duckduckgo', label: 'DuckDuckGo' },
  { id: 'tavily', label: 'Tavily' },
] as const

export const RESEARCH_SETTINGS_COLLAPSE_KEY = 'odysseus-research-settings-collapsed'

export interface ResearchSettingsValues {
  category: string
  maxRounds: number
  searchProvider: string
  endpointId: string
  model: string
}

export type ResearchBatchMode = 'parallel' | 'sequential'

export function researchSettingsToRequest(values: ResearchSettingsValues, query: string) {
  return {
    query: query.trim(),
    max_rounds: values.maxRounds,
    category: values.category || null,
    search_provider: values.searchProvider || null,
    endpoint_id: values.endpointId || null,
    model: values.model || null,
  }
}
