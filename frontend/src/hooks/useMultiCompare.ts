import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { postChatStream } from '@/api/chat'
import { startComparison, voteComparison } from '@/api/compare'
import { createSession, deleteSession } from '@/api/sessions'
import {
  recordCompareVoteRemote,
  saveCompareVote,
  type CompareVoteMode,
  type CompareVoteRecord,
} from '@/features/compare/compareScoreboard'
import { blindSlotLabel, modelDisplayName } from '@/features/compare/compareHelpers'
import { pickShuffleModels } from '@/features/compare/shufflePool'
import { consumeSseStream } from '@/lib/sseParser'
import type { CompareStartResponse, ModelOption } from '@/api/types'

export interface MultiComparePane {
  key: string
  model: ModelOption | null
  sessionId: string | null
  content: string
  isStreaming: boolean
  done: boolean
  label: string
  winner?: boolean
  loser?: boolean
}

export interface MultiCompareState {
  panes: MultiComparePane[]
  voted: boolean
  isBlind: boolean
  lastPrompt: string
  compId: string | null
  response: CompareStartResponse | null
  revealed: string[] | null
}

export const MAX_COMPARE_PANES = 8
export const DEFAULT_PANE_COUNT = 2

function newPaneKey() {
  return `pane-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyPane(label: string): MultiComparePane {
  return {
    key: newPaneKey(),
    model: null,
    sessionId: null,
    content: '',
    isStreaming: false,
    done: false,
    label,
  }
}

function streamPane(
  sessionId: string,
  prompt: string,
  onUpdate: (content: string, done: boolean) => void,
  signal: AbortSignal,
) {
  const fd = new FormData()
  fd.append('message', prompt)
  fd.append('session', sessionId)
  fd.append('mode', 'chat')
  fd.append('use_rag', 'false')
  fd.append('no_documents', 'true')
  fd.append('no_memory', 'true')
  fd.append('compare_mode', 'true')

  return (async () => {
    let text = ''
    try {
      const res = await postChatStream(fd, signal)
      await consumeSseStream(
        res,
        (event) => {
          if (event.type === 'delta') {
            text += event.text
            onUpdate(text, false)
          } else if (event.type === 'error') {
            onUpdate(`Error: ${event.message}`, true)
          }
        },
        signal,
      )
      onUpdate(text, true)
    } catch (err) {
      if (!signal.aborted) {
        onUpdate(`Error: ${err instanceof Error ? err.message : 'Stream failed'}`, true)
      }
    }
  })()
}

export function useMultiCompare() {
  const [state, setState] = useState<MultiCompareState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const sessionIdsRef = useRef<string[]>([])

  const cleanupSessions = useCallback(async (ids: string[]) => {
    await Promise.all(ids.map((id) => deleteSession(id).catch(() => {})))
  }, [])

  const initPanes = useCallback((models: ModelOption[], isBlind: boolean, count = DEFAULT_PANE_COUNT) => {
    const panes: MultiComparePane[] = []
    for (let i = 0; i < count; i++) {
      const model = models[i] ?? null
      panes.push({
        ...emptyPane(isBlind ? blindSlotLabel(i) : model ? modelDisplayName(model) : `Model ${i + 1}`),
        model,
      })
    }
    setState({
      panes,
      voted: false,
      isBlind,
      lastPrompt: '',
      compId: null,
      response: null,
      revealed: null,
    })
  }, [])

  const setPaneModel = useCallback((index: number, model: ModelOption | null) => {
    setState((prev) => {
      if (!prev) return prev
      const panes = [...prev.panes]
      const pane = panes[index]
      if (!pane) return prev
      panes[index] = {
        ...pane,
        model,
        label: prev.isBlind
          ? blindSlotLabel(index)
          : model
            ? modelDisplayName(model)
            : `Model ${index + 1}`,
      }
      return { ...prev, panes }
    })
  }, [])

  const addPane = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.panes.length >= MAX_COMPARE_PANES) return prev
      const i = prev.panes.length
      return {
        ...prev,
        panes: [...prev.panes, emptyPane(prev.isBlind ? blindSlotLabel(i) : `Model ${i + 1}`)],
      }
    })
  }, [])

  const removePane = useCallback((index: number) => {
    setState((prev) => {
      if (!prev || prev.panes.length <= 1) return prev
      const panes = prev.panes.filter((_, i) => i !== index).map((p, i) => ({
        ...p,
        label: prev.isBlind ? blindSlotLabel(i) : p.model ? modelDisplayName(p.model) : `Model ${i + 1}`,
      }))
      return { ...prev, panes }
    })
  }, [])

  const shuffleModelsFromPool = useCallback(
    (modelPool: ModelOption[], enableBlind = true) => {
      if (isRunning || !state || state.panes.length < 2) return false
      const picked = pickShuffleModels(modelPool, state.panes.length)
      if (!picked.length) return false
      setState((prev) => {
        if (!prev || prev.panes.length < 2) return prev
        const isBlind = enableBlind ? true : prev.isBlind
        const panes = prev.panes.map((p, i) => {
          const model = picked[i % picked.length] ?? null
          return {
            ...p,
            model,
            label: isBlind
              ? blindSlotLabel(i)
              : model
                ? modelDisplayName(model)
                : `Model ${i + 1}`,
            winner: false,
            loser: false,
            content: '',
            isStreaming: false,
            done: false,
          }
        })
        return {
          ...prev,
          panes,
          isBlind,
          voted: false,
          revealed: null,
          lastPrompt: '',
          compId: null,
          response: null,
        }
      })
      return true
    },
    [isRunning, state],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setIsRunning(false)
    setState((prev) =>
      prev
        ? {
            ...prev,
            panes: prev.panes.map((p) => ({ ...p, isStreaming: false })),
          }
        : prev,
    )
  }, [])

  const runCompare = useCallback(
    async (
      prompt: string,
      isBlind: boolean,
      panesOverride?: MultiComparePane[],
    ) => {
      const trimmed = prompt.trim()
      if (!trimmed) {
        toast.error('Enter a prompt to compare')
        return
      }

      const panes = panesOverride ?? state?.panes ?? []
      const models = panes.map((p) => p.model).filter(Boolean) as ModelOption[]
      if (models.length < 1) {
        toast.error('Select at least one model')
        return
      }
      if (new Set(models.map((m) => `${m.endpointId}:${m.id}`)).size !== models.length) {
        toast.error('Each pane needs a different model')
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setIsRunning(true)

      const prevSessions = [...sessionIdsRef.current]
      sessionIdsRef.current = []

      try {
        if (prevSessions.length) await cleanupSessions(prevSessions)

        let compId: string | null = null
        let response: CompareStartResponse | null = null
        const sessionIds: string[] = []

        if (models.length === 2 && panes[0]?.model && panes[1]?.model) {
          response = await startComparison({
            prompt: trimmed,
            modelA: panes[0].model.id,
            modelB: panes[1].model.id,
            endpointA: panes[0].model.url,
            endpointB: panes[1].model.url,
            isBlind,
          })
          compId = response.id
          sessionIds.push(response.session_left, response.session_right)
        } else {
          for (const model of models) {
            const res = await createSession(
              { modelId: model.id, url: model.url, endpointId: model.endpointId },
              `[CMP] ${isBlind ? 'Model' : modelDisplayName(model)}`,
            )
            sessionIds.push(res.id)
          }
        }

        sessionIdsRef.current = sessionIds

        const labels = panes.map((p, i) =>
          isBlind ? blindSlotLabel(i) : p.model ? modelDisplayName(p.model) : `Model ${i + 1}`,
        )

        setState((prev) => {
          const base = prev?.panes ?? panes
          return {
            panes: base.map((p, i) => ({
              ...p,
              sessionId: sessionIds[i] ?? null,
              content: '',
              isStreaming: Boolean(sessionIds[i]),
              done: false,
              label: labels[i] ?? p.label,
              winner: false,
              loser: false,
            })),
            voted: false,
            isBlind,
            lastPrompt: trimmed,
            compId,
            response,
            revealed: null,
          }
        })

        await Promise.all(
          sessionIds.map((sid, i) =>
            streamPane(
              sid,
              trimmed,
              (content, done) => {
                setState((prev) => {
                  if (!prev) return prev
                  const next = [...prev.panes]
                  const pane = next[i]
                  if (!pane) return prev
                  next[i] = {
                    ...pane,
                    content,
                    isStreaming: !done,
                    done: done || pane.done,
                  }
                  return { ...prev, panes: next }
                })
              },
              controller.signal,
            ),
          ),
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Compare failed')
      } finally {
        setIsRunning(false)
      }
    },
    [state?.panes, cleanupSessions],
  )

  const persistVote = useCallback(
    (
      winnerIdx: number | 'tie',
      panes: MultiComparePane[],
      prompt: string,
      isBlind: boolean,
      mode: CompareVoteMode = 'chat',
    ) => {
      const modelNames = panes.map((p) =>
        p.model ? modelDisplayName(p.model) : p.label,
      )
      const winner =
        winnerIdx === 'tie' ? 'tie' : modelNames[winnerIdx] ?? 'tie'
      const record: CompareVoteRecord = {
        models: modelNames,
        winner,
        prompt,
        blind: isBlind,
        mode,
        timestamp: Date.now(),
      }
      saveCompareVote(record)
      recordCompareVoteRemote({
        prompt,
        models: modelNames,
        winner,
        is_blind: isBlind,
      })
    },
    [],
  )

  const submitVote = useCallback(
    async (winnerIdx: number | 'tie', compareMode: CompareVoteMode = 'chat') => {
      if (!state || state.voted) return

      const modelNames = state.panes.map((p) =>
        p.model ? modelDisplayName(p.model) : p.label,
      )

      if (state.compId && state.panes.length === 2 && winnerIdx !== 'tie') {
        try {
          const side = winnerIdx === 0 ? 'left' : 'right'
          const result = await voteComparison(state.compId, side)
          setState((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              voted: true,
              revealed: [result.revealed.left, result.revealed.right],
              panes: prev.panes.map((p, i) => ({
                ...p,
                label: i === 0 ? result.revealed.left : result.revealed.right,
                winner: winnerIdx === i,
                loser: winnerIdx !== i,
              })),
            }
          })
          persistVote(winnerIdx, state.panes, state.lastPrompt, state.isBlind, compareMode)
          toast.success('Vote recorded')
          return
        } catch {
          /* fall through to local-only vote */
        }
      }

      if (state.compId && state.panes.length === 2 && winnerIdx === 'tie') {
        try {
          await voteComparison(state.compId, 'tie')
        } catch {
          /* ignore */
        }
      }

      const revealed = state.isBlind ? modelNames : null
      setState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          voted: true,
          revealed,
          panes: prev.panes.map((p, i) => ({
            ...p,
            label: revealed?.[i] ?? (p.model ? modelDisplayName(p.model) : p.label),
            winner: winnerIdx !== 'tie' && winnerIdx === i,
            loser: winnerIdx !== 'tie' && winnerIdx !== i,
          })),
        }
      })
      persistVote(winnerIdx, state.panes, state.lastPrompt, state.isBlind, compareMode)
      toast.success('Vote recorded')
    },
    [state, persistVote],
  )

  const reset = useCallback(async () => {
    abortRef.current?.abort()
    const ids = [...sessionIdsRef.current]
    sessionIdsRef.current = []
    setState(null)
    setIsRunning(false)
    if (ids.length) await cleanupSessions(ids)
  }, [cleanupSessions])

  return {
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
  }
}
