import { Dices, LayoutGrid, ListFilter, Plus, X } from 'lucide-react'
import { MarkdownMessage } from '@/components/chat/MarkdownMessage'
import { ModelPicker } from '@/components/chat/ModelPicker'
import { Button } from '@/components/ui/button'
import { compareGridColumns } from '@/features/compare/compareHelpers'
import type { CompareVoteMode } from '@/features/compare/compareScoreboard'
import type { MultiComparePane } from '@/hooks/useMultiCompare'
import type { ModelOption } from '@/api/types'
import { cn } from '@/lib/utils'

const COMPARE_MODES: CompareVoteMode[] = ['chat', 'agent', 'search', 'research']
const MODE_LABELS: Record<CompareVoteMode, string> = {
  chat: 'Chat',
  agent: 'Agent',
  search: 'Search',
  research: 'Research',
}

interface CompareGridProps {
  panes: MultiComparePane[]
  models: ModelOption[]
  isBlind: boolean
  isRunning: boolean
  voted: boolean
  lastPrompt: string
  compareMode: CompareVoteMode
  onCompareModeChange: (mode: CompareVoteMode) => void
  onPaneModelChange: (index: number, model: ModelOption) => void
  onRemovePane: (index: number) => void
  onVote: (winnerIdx: number | 'tie') => void
  onShuffle: () => void
  onOpenShufflePool: () => void
  onAddPane: () => void
  onOpenScoreboard: () => void
  maxPanes: number
}

function ComparePaneCard({
  pane,
  index,
  models,
  isBlind,
  isRunning,
  voted,
  hasPrompt,
  onModelChange,
  onRemove,
  onVote,
  canRemove,
}: {
  pane: MultiComparePane
  index: number
  models: ModelOption[]
  isBlind: boolean
  isRunning: boolean
  voted: boolean
  hasPrompt: boolean
  onModelChange: (model: ModelOption) => void
  onRemove: () => void
  onVote: () => void
  canRemove: boolean
}) {
  const canVote = hasPrompt && pane.done && !voted && !isRunning

  return (
    <div
      className={cn(
        'flex min-h-[240px] flex-col rounded-lg border bg-background',
        pane.winner && 'border-success ring-1 ring-success/40',
        pane.loser && 'border-border opacity-80',
        !pane.winner && !pane.loser && 'border-border',
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        {!isBlind ? (
          <div className="min-w-0 flex-1">
            <ModelPicker
              models={models}
              value={pane.model?.id ?? null}
              onChange={onModelChange}
              disabled={isRunning}
            />
          </div>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{pane.label}</span>
        )}
        {pane.isStreaming ? (
          <span className="shrink-0 text-xs text-muted-foreground animate-pulse">Streaming…</span>
        ) : null}
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={isRunning}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-panel hover:text-foreground disabled:opacity-40"
            title="Remove pane"
            aria-label={`Remove pane ${index + 1}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {pane.content ? (
          <MarkdownMessage content={pane.content} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {pane.isStreaming ? 'Waiting for response…' : 'No output yet'}
          </p>
        )}
      </div>

      {canVote ? (
        <div className="border-t border-border p-2">
          <Button size="sm" variant="outline" className="w-full" onClick={onVote}>
            Vote {pane.label}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function CompareGrid({
  panes,
  models,
  isBlind,
  isRunning,
  voted,
  lastPrompt,
  compareMode,
  onCompareModeChange,
  onPaneModelChange,
  onRemovePane,
  onVote,
  onShuffle,
  onOpenShufflePool,
  onAddPane,
  onOpenScoreboard,
  maxPanes,
}: CompareGridProps) {
  const cols = compareGridColumns(panes.length)
  const hasPrompt = Boolean(lastPrompt.trim())
  const anyDone = panes.some((p) => p.done)
  const canVoteAny = hasPrompt && anyDone && !voted && !isRunning

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {COMPARE_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onCompareModeChange(mode)}
            disabled={isRunning}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50',
              compareMode === mode
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-panel',
            )}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Comparing {panes.length} model{panes.length !== 1 ? 's' : ''}
          {isBlind ? ' (blind)' : ''}
        </p>
        <div className="flex flex-wrap gap-1">
          <Button type="button" size="sm" variant="outline" onClick={onOpenScoreboard}>
            <LayoutGrid className="mr-1 h-3.5 w-3.5" />
            Score
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onShuffle}
            disabled={isRunning || panes.length < 2}
            title="Randomly pick models from shuffle pool (respects exclusions)"
          >
            <Dices className="mr-1 h-3.5 w-3.5" />
            Shuffle
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenShufflePool}
            disabled={isRunning}
            title="Edit shuffle pool — exclude broken models"
          >
            <ListFilter className="mr-1 h-3.5 w-3.5" />
            Pool
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddPane}
            disabled={isRunning || panes.length >= maxPanes}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {panes.map((pane, index) => (
          <ComparePaneCard
            key={pane.key}
            pane={pane}
            index={index}
            models={models}
            isBlind={isBlind}
            isRunning={isRunning}
            voted={voted}
            hasPrompt={hasPrompt}
            onModelChange={(m) => onPaneModelChange(index, m)}
            onRemove={() => onRemovePane(index)}
            onVote={() => onVote(index)}
            canRemove={panes.length > 1}
          />
        ))}
      </div>

      {canVoteAny ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Or declare a tie:</span>
          <Button size="sm" variant="secondary" onClick={() => onVote('tie')}>
            Tie
          </Button>
        </div>
      ) : null}
    </div>
  )
}
