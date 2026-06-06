import { useEffect, useMemo, useState } from 'react'
import { GitCompare } from 'lucide-react'
import { toast } from 'sonner'
import { CompareExportMenu } from '@/features/compare/CompareExportMenu'
import { CompareGrid } from '@/features/compare/CompareGrid'
import { CompareHistoryPanel } from '@/features/compare/CompareHistoryPanel'
import { CompareProbeButton, CompareProbePanel } from '@/features/compare/CompareProbeButton'
import { CompareScoreboardDialog } from '@/features/compare/CompareScoreboardDialog'
import { CompareShufflePoolDialog } from '@/features/compare/CompareShufflePoolDialog'
import { blindSlotLabel, modelDisplayName } from '@/features/compare/compareHelpers'
import type { CompareVoteMode } from '@/features/compare/compareScoreboard'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DEFAULT_PANE_COUNT, MAX_COMPARE_PANES, useMultiCompare } from '@/hooks/useMultiCompare'
import { useModels } from '@/hooks/useModels'
import type { ModelOption } from '@/api/types'
import type { CompareRunState } from '@/hooks/useCompare'
import type { MultiCompareState } from '@/hooks/useMultiCompare'

function multiToExportState(state: MultiCompareState): CompareRunState | null {
  if (state.panes.length < 2) return null
  const [left, right] = state.panes
  return {
    compId: state.compId,
    response: state.response,
    left: {
      content: left.content,
      isStreaming: left.isStreaming,
      done: left.done,
      label: left.label,
    },
    right: {
      content: right.content,
      isStreaming: right.isStreaming,
      done: right.done,
      label: right.label,
    },
    voted: state.voted,
    revealed:
      state.revealed && state.revealed.length >= 2
        ? { left: state.revealed[0], right: state.revealed[1] }
        : null,
    isBlind: state.isBlind,
  }
}

export function ComparePage() {
  const { modelOptions, defaultChat, isLoading, hasModels } = useModels()
  const {
    state,
    isRunning,
    initPanes,
    setPaneModel,
    addPane,
    removePane,
    shuffleModelsFromPool,
    runCompare,
    submitVote,
    stop,
    reset,
  } = useMultiCompare()

  const [prompt, setPrompt] = useState('')
  const [isBlind, setIsBlind] = useState(true)
  const [compareMode, setCompareMode] = useState<CompareVoteMode>('chat')
  const [scoreboardOpen, setScoreboardOpen] = useState(false)
  const [shufflePoolOpen, setShufflePoolOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const defaultModels = useMemo((): ModelOption[] => {
    const first = defaultChat?.model
      ? modelOptions.find(
          (m) => m.id === defaultChat.model && m.endpointId === defaultChat.endpoint_id,
        )
      : undefined
    const a = first ?? modelOptions[0] ?? null
    const b = modelOptions.find((m) => m.id !== a?.id) ?? modelOptions[1] ?? null
    return [a, b].filter((m): m is ModelOption => m != null)
  }, [defaultChat, modelOptions])

  useEffect(() => {
    if (!hasModels || initialized || !defaultModels.length) return
    initPanes(defaultModels, isBlind, DEFAULT_PANE_COUNT)
    setInitialized(true)
  }, [hasModels, initialized, defaultModels, initPanes, isBlind])

  const handleBlindChange = (next: boolean) => {
    setIsBlind(next)
    if (state && !state.lastPrompt) {
      initPanes(
        state.panes.map((p) => p.model).filter((m): m is ModelOption => m != null),
        next,
        state.panes.length,
      )
    }
  }

  const exportState = state && state.panes.length === 2 ? multiToExportState(state) : null
  const probeLeft = state?.panes[0]?.model ?? defaultModels[0] ?? null
  const probeRight = state?.panes[1]?.model ?? defaultModels[1] ?? null

  const handleRun = () => {
    if (!state && defaultModels.length) {
      initPanes(defaultModels, isBlind, DEFAULT_PANE_COUNT)
    }
    const panesOverride =
      state?.panes ??
      defaultModels.map((model, i) => ({
        key: `init-${i}`,
        model,
        sessionId: null,
        content: '',
        isStreaming: false,
        done: false,
        label: isBlind ? blindSlotLabel(i) : modelDisplayName(model),
      }))
    void runCompare(prompt, isBlind, panesOverride)
  }

  const handleShuffle = () => {
    const ok = shuffleModelsFromPool(modelOptions, true)
    if (ok) {
      setIsBlind(true)
      toast.message('Shuffled · blind mode on')
    } else {
      toast.error('No eligible models in shuffle pool — check Pool settings')
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <GitCompare className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Compare</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Send the same prompt to up to {MAX_COMPARE_PANES} models in parallel, vote, and track wins on
          the scoreboard.
        </p>
      </div>

      {!hasModels && !isLoading && (
        <p className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          Configure a model endpoint in Settings before comparing models.
        </p>
      )}

      <div className="space-y-4 rounded-lg border border-border bg-panel/30 p-4">
        <div className="space-y-2">
          <Label htmlFor="compare-prompt">Prompt</Label>
          <textarea
            id="compare-prompt"
            className="min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter the same prompt for all models…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!hasModels || isLoading || isRunning}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={isBlind}
            onChange={(e) => handleBlindChange(e.target.checked)}
            disabled={!hasModels || isLoading || isRunning}
            className="rounded border-border"
          />
          Blind comparison (hide model names until you vote)
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {isRunning ? (
            <Button variant="outline" onClick={stop}>
              Stop
            </Button>
          ) : (
            <Button onClick={handleRun} disabled={!hasModels || isLoading || !prompt.trim()}>
              <GitCompare className="mr-2 h-4 w-4" />
              Compare
            </Button>
          )}
          <CompareProbeButton
            modelLeft={probeLeft}
            modelRight={probeRight}
            isBlind={isBlind}
            disabled={!hasModels || isLoading || isRunning}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => setScoreboardOpen(true)}>
            Scoreboard
          </Button>
          {state ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => void reset()}>
              Reset
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <CompareProbePanel disabled={!hasModels || isLoading || isRunning} />
      </div>

      {state ? (
        <div className="mt-6 space-y-4">
          <div className="flex justify-end">
            <CompareExportMenu
              state={exportState ?? undefined}
              multiPanes={
                state.panes.length >= 2
                  ? state.panes.map((p) => ({
                      label: p.label,
                      content: p.content,
                      done: p.done,
                    }))
                  : undefined
              }
              prompt={prompt || state.lastPrompt}
              isBlind={state.isBlind}
              revealed={state.revealed}
              compareMode={compareMode}
              disabled={isRunning}
            />
          </div>
          <CompareGrid
            panes={state.panes}
            models={modelOptions}
            isBlind={state.isBlind}
            isRunning={isRunning}
            voted={state.voted}
            lastPrompt={state.lastPrompt}
            compareMode={compareMode}
            onCompareModeChange={setCompareMode}
            onPaneModelChange={setPaneModel}
            onRemovePane={removePane}
            onVote={(idx) => void submitVote(idx, compareMode)}
            onShuffle={handleShuffle}
            onOpenShufflePool={() => setShufflePoolOpen(true)}
            onAddPane={addPane}
            onOpenScoreboard={() => setScoreboardOpen(true)}
            maxPanes={MAX_COMPARE_PANES}
          />
        </div>
      ) : (
        <div className="mt-6 flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Run a comparison to see the multi-pane grid (up to {MAX_COMPARE_PANES} models).
        </div>
      )}

      <div className="mt-8">
        <CompareHistoryPanel />
      </div>

      <CompareScoreboardDialog open={scoreboardOpen} onClose={() => setScoreboardOpen(false)} />
      <CompareShufflePoolDialog
        open={shufflePoolOpen}
        models={modelOptions}
        onClose={() => setShufflePoolOpen(false)}
      />
    </div>
  )
}
