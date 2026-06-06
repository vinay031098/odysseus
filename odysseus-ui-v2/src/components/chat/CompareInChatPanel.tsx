import { Dices, Eye, EyeOff, GitCompare, X } from 'lucide-react'
import { MarkdownMessage } from '@/components/chat/MarkdownMessage'
import { Button } from '@/components/ui/button'
import type { CompareInChatState } from '@/hooks/useCompareInChat'
import { cn } from '@/lib/utils'

interface CompareInChatPanelProps {
  state: CompareInChatState
  isStreaming: boolean
  onVote: (winner: 'left' | 'right' | 'tie') => void
  onClose: () => void
  onStop: () => void
  onShuffle: () => void
  onToggleBlind: (blind: boolean) => void
}

function Pane({
  pane,
  side,
  onVote,
  canVote,
}: {
  pane: CompareInChatState['left']
  side: 'left' | 'right'
  onVote: (winner: 'left' | 'right' | 'tie') => void
  canVote: boolean
}) {
  return (
    <div className="flex min-h-[200px] flex-col rounded-lg border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="truncate text-sm font-medium">{pane.label}</span>
        {pane.isStreaming && (
          <span className="text-xs text-muted-foreground animate-pulse">Streaming…</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {pane.content ? (
          <MarkdownMessage content={pane.content} censor />
        ) : (
          <p className="text-sm text-muted-foreground">Waiting for response…</p>
        )}
      </div>
      {canVote && pane.done && (
        <div className="border-t border-border p-2">
          <Button size="sm" variant="outline" className="w-full" onClick={() => onVote(side)}>
            Pick {side}
          </Button>
        </div>
      )}
    </div>
  )
}

export function CompareInChatPanel({
  state,
  isStreaming,
  onVote,
  onClose,
  onStop,
  onShuffle,
  onToggleBlind,
}: CompareInChatPanelProps) {
  const bothDone = state.left.done && state.right.done
  const canVote = bothDone && !state.voted && Boolean(state.compId)

  return (
    <div className="border-b border-border bg-background px-4 py-3">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <GitCompare className="h-4 w-4 text-primary" />
            Compare in chat
            {state.round > 1 ? (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                Round {state.round}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={state.blindMode ? 'secondary' : 'outline'}
              onClick={() => onToggleBlind(!state.blindMode)}
              disabled={isStreaming || state.voted}
            >
              {state.blindMode ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}
              Blind
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onShuffle}
              disabled={isStreaming || state.voted}
              title="Shuffle pane positions"
            >
              <Dices className="mr-1 h-3.5 w-3.5" />
              Shuffle
            </Button>
            {isStreaming ? (
              <Button size="sm" variant="destructive" onClick={onStop}>
                Stop
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close compare">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {state.blindMode && !state.voted ? (
          <p className="text-xs text-muted-foreground">
            Blind mode — model names stay hidden until you vote. Shuffle re-randomizes pane order.
          </p>
        ) : null}
        <div className={cn('grid gap-3', 'md:grid-cols-2')}>
          <Pane pane={state.left} side="left" onVote={onVote} canVote={canVote} />
          <Pane pane={state.right} side="right" onVote={onVote} canVote={canVote} />
        </div>
        {canVote && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Which response is better?</span>
            <Button size="sm" variant="secondary" onClick={() => onVote('tie')}>
              Tie
            </Button>
          </div>
        )}
        {state.voted && !isStreaming ? (
          <p className="text-center text-xs text-muted-foreground">
            Vote recorded. Send another prompt in the composer for follow-up round {state.round + 1}.
          </p>
        ) : null}
      </div>
    </div>
  )
}
