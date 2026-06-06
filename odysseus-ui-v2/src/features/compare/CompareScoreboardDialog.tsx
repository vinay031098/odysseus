import { useEffect, useState } from 'react'
import { LayoutGrid, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  aggregateCompareStats,
  clearCompareVotes,
  guessVoteMode,
  type CompareVoteMode,
  loadCompareVotes,
} from './compareScoreboard'
import { cn } from '@/lib/utils'

const MODES: CompareVoteMode[] = ['chat', 'agent', 'search', 'research']
const MODE_LABELS: Record<CompareVoteMode, string> = {
  chat: 'Chat',
  agent: 'Agent',
  search: 'Search',
  research: 'Research',
}

interface CompareScoreboardProps {
  open: boolean
  onClose: () => void
}

export function CompareScoreboardDialog({ open, onClose }: CompareScoreboardProps) {
  const [activeMode, setActiveMode] = useState<CompareVoteMode>('chat')
  const [confirmClear, setConfirmClear] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [votes, setVotes] = useState<ReturnType<typeof loadCompareVotes>>([])

  useEffect(() => {
    if (open) setVotes(loadCompareVotes())
  }, [open, refreshKey])
  const sorted = aggregateCompareStats(votes, activeMode)
  const modeVoteCount = votes.filter((v) => guessVoteMode(v) === activeMode).length

  if (!open) return null

  function handleClear() {
    clearCompareVotes()
    setConfirmClear(false)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div
      className="modal fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-scoreboard-title"
    >
      <div className="modal-content max-h-[85vh] w-full max-w-lg overflow-hidden rounded-lg border border-border bg-background shadow-xl p-0">
        <div className="modal-header justify-between px-4 py-3">
          <h3 id="compare-scoreboard-title" className="flex items-center gap-2 text-sm font-semibold">
            <LayoutGrid className="h-4 w-4" aria-hidden />
            Scoreboard
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-panel hover:text-foreground"
            aria-label="Close scoreboard"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          <div className="mb-3 flex flex-wrap gap-1">
            {MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveMode(mode)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                  activeMode === mode
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-panel',
                )}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>

          {sorted.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No {activeMode} votes yet. Run a comparison and vote!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2 pr-2 font-medium">Model</th>
                    <th className="pb-2 px-1 text-center font-medium">Win%</th>
                    <th className="pb-2 px-1 text-center font-medium">W</th>
                    <th className="pb-2 px-1 text-center font-medium">L</th>
                    <th className="pb-2 px-1 text-center font-medium">T</th>
                    <th className="pb-2 px-1 text-center font-medium">Games</th>
                    <th className="pb-2 pl-1 text-center font-medium">$/1k</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(([name, s]) => {
                    const pct = s.games ? Math.round((s.wins / s.games) * 100) : 0
                    const avgCost = s.costCount ? (s.totalCost / s.costCount) * 1000 : null
                    const costStr =
                      avgCost !== null
                        ? `$${avgCost < 1 ? avgCost.toFixed(2) : avgCost.toFixed(0)}`
                        : '—'
                    return (
                      <tr key={name} className="border-b border-border/50 hover:bg-panel/40">
                        <td className="max-w-[140px] truncate py-2 pr-2 font-medium">{name}</td>
                        <td className="px-1 py-2 text-center">
                          <strong>{pct}%</strong>
                        </td>
                        <td className="px-1 py-2 text-center">{s.wins}</td>
                        <td className="px-1 py-2 text-center">{s.losses}</td>
                        <td className="px-1 py-2 text-center">{s.ties}</td>
                        <td className="px-1 py-2 text-center">{s.games}</td>
                        <td
                          className="px-1 py-2 text-center text-success"
                          title="Avg estimated cost per 1,000 responses"
                        >
                          {costStr}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            {modeVoteCount} vote{modeVoteCount !== 1 ? 's' : ''} recorded
          </p>

          {confirmClear ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
              <span className="text-xs text-muted-foreground">Clear all vote history?</span>
              <Button type="button" size="sm" variant="destructive" onClick={handleClear}>
                Clear
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-xs opacity-60 hover:opacity-100"
                onClick={() => setConfirmClear(true)}
              >
                Clear history
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
