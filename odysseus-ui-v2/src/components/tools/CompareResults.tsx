import { MarkdownMessage } from '@/components/chat/MarkdownMessage'
import { Button } from '@/components/ui/button'
import type { CompareRunState } from '@/hooks/useCompare'
import { cn } from '@/lib/utils'

interface CompareResultsProps {
  state: CompareRunState | null
  onVote: (winner: 'left' | 'right' | 'tie') => void
  onReset: () => void
}

function PaneColumn({
  pane,
  side,
  onVote,
  canVote,
}: {
  pane: CompareRunState['left']
  side: 'left' | 'right'
  onVote: (winner: 'left' | 'right' | 'tie') => void
  canVote: boolean
}) {
  return (
    <div className="flex min-h-[280px] flex-col rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium">{pane.label}</span>
        {pane.isStreaming && (
          <span className="text-xs text-muted-foreground animate-pulse">Streaming…</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {pane.content ? (
          <MarkdownMessage content={pane.content} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {pane.isStreaming ? 'Waiting for response…' : 'No output yet'}
          </p>
        )}
      </div>
      {canVote && pane.done && (
        <div className="border-t border-border p-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onVote(side)}
          >
            Pick {side === 'left' ? 'left' : 'right'}
          </Button>
        </div>
      )}
    </div>
  )
}

export function CompareResults({ state, onVote, onReset }: CompareResultsProps) {
  if (!state) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Run a comparison to see side-by-side results here.
      </div>
    )
  }

  const bothDone = state.left.done && state.right.done
  const canVote = bothDone && !state.voted && Boolean(state.compId)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <PaneColumn pane={state.left} side="left" onVote={onVote} canVote={canVote} />
        <PaneColumn pane={state.right} side="right" onVote={onVote} canVote={canVote} />
      </div>

      {canVote && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Which response is better?</span>
          <Button size="sm" onClick={() => onVote('tie')} variant="secondary">
            Tie
          </Button>
        </div>
      )}

      {state.voted && state.revealed && (
        <p className={cn('text-center text-sm text-muted-foreground')}>
          Revealed: <strong>{state.revealed.left}</strong> vs{' '}
          <strong>{state.revealed.right}</strong>
        </p>
      )}

      {bothDone && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={onReset}>
            New comparison
          </Button>
        </div>
      )}
    </div>
  )
}
