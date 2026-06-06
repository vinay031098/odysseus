export const VOTES_STORAGE_KEY = 'odysseus-compare-votes'
export const VOTES_MAX = 200

export type CompareVoteMode = 'chat' | 'agent' | 'search' | 'research'

export interface CompareVoteRecord {
  models: string[]
  winner: string
  prompt?: string
  blind?: boolean
  mode?: CompareVoteMode | string
  timestamp: number
  costs?: (number | null)[]
}

export interface CompareModelStats {
  wins: number
  losses: number
  ties: number
  games: number
  totalCost: number
  costCount: number
}

const SEARCH_PROVIDER_NAMES = new Set([
  'brave search',
  'duckduckgo',
  'google',
  'searxng',
  'bing',
  'tavily',
])

export function loadCompareVotes(): CompareVoteRecord[] {
  try {
    const raw = localStorage.getItem(VOTES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CompareVoteRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCompareVote(record: CompareVoteRecord): void {
  const votes = loadCompareVotes()
  votes.push(record)
  if (votes.length > VOTES_MAX) votes.splice(0, votes.length - VOTES_MAX)
  try {
    localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(votes))
  } catch {
    /* ignore quota errors */
  }
}

export function clearCompareVotes(): void {
  try {
    localStorage.removeItem(VOTES_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Guess compare mode for legacy votes that lack a mode field. */
export function guessVoteMode(v: CompareVoteRecord): CompareVoteMode {
  if (v.mode === 'chat' || v.mode === 'agent' || v.mode === 'search' || v.mode === 'research') {
    return v.mode
  }
  if (v.models?.some((m) => SEARCH_PROVIDER_NAMES.has(m.toLowerCase()))) return 'search'
  return 'chat'
}

export function aggregateCompareStats(
  votes: CompareVoteRecord[],
  mode: CompareVoteMode,
): Array<[string, CompareModelStats]> {
  const filtered = votes.filter((v) => guessVoteMode(v) === mode)
  const stats: Record<string, CompareModelStats> = {}

  for (const v of filtered) {
    for (let mi = 0; mi < v.models.length; mi++) {
      const m = v.models[mi]
      if (!stats[m]) {
        stats[m] = { wins: 0, losses: 0, ties: 0, games: 0, totalCost: 0, costCount: 0 }
      }
      stats[m].games++
      if (v.winner === 'tie') stats[m].ties++
      else if (v.winner === m) stats[m].wins++
      else stats[m].losses++
      if (v.costs && v.costs[mi] != null) {
        stats[m].totalCost += v.costs[mi] as number
        stats[m].costCount++
      }
    }
  }

  return Object.entries(stats).sort((a, b) => {
    const rateA = a[1].games ? a[1].wins / a[1].games : 0
    const rateB = b[1].games ? b[1].wins / b[1].games : 0
    return rateB - rateA
  })
}

export function recordCompareVoteRemote(record: {
  prompt: string
  models: string[]
  winner: string
  is_blind: boolean
}): void {
  try {
    void fetch('/api/compare/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })
  } catch {
    /* fire-and-forget */
  }
}
