import { describe, expect, it, beforeEach } from 'vitest'
import {
  aggregateCompareStats,
  clearCompareVotes,
  guessVoteMode,
  loadCompareVotes,
  saveCompareVote,
  VOTES_STORAGE_KEY,
} from './compareScoreboard'

describe('compareScoreboard', () => {
  beforeEach(() => {
    localStorage.removeItem(VOTES_STORAGE_KEY)
  })

  it('persists and loads votes', () => {
    saveCompareVote({
      models: ['gpt-4', 'claude-3'],
      winner: 'gpt-4',
      mode: 'chat',
      timestamp: Date.now(),
    })
    const votes = loadCompareVotes()
    expect(votes).toHaveLength(1)
    expect(votes[0].winner).toBe('gpt-4')
  })

  it('guesses search mode from provider names', () => {
    expect(
      guessVoteMode({ models: ['Brave Search', 'gpt-4'], winner: 'tie', timestamp: 0 }),
    ).toBe('search')
  })

  it('aggregates win rates by mode', () => {
    saveCompareVote({
      models: ['A', 'B'],
      winner: 'A',
      mode: 'chat',
      timestamp: 1,
    })
    saveCompareVote({
      models: ['A', 'C'],
      winner: 'tie',
      mode: 'chat',
      timestamp: 2,
    })
    saveCompareVote({
      models: ['Agent-1', 'Agent-2'],
      winner: 'Agent-1',
      mode: 'agent',
      timestamp: 3,
    })
    const stats = aggregateCompareStats(loadCompareVotes(), 'chat')
    const a = stats.find(([name]) => name === 'A')?.[1]
    expect(a?.wins).toBe(1)
    expect(a?.ties).toBe(1)
    expect(a?.games).toBe(2)
    const agentStats = aggregateCompareStats(loadCompareVotes(), 'agent')
    expect(agentStats[0]?.[0]).toBe('Agent-1')
    expect(agentStats[0]?.[1].wins).toBe(1)
  })

  it('clears vote history', () => {
    saveCompareVote({ models: ['x'], winner: 'x', timestamp: 0 })
    clearCompareVotes()
    expect(loadCompareVotes()).toEqual([])
  })
})
