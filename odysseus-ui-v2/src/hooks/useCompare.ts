import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { startComparison, voteComparison } from '@/api/compare'
import { postChatStream } from '@/api/chat'
import { resolveComparePaneLabels } from '@/features/compare/compareHelpers'
import {
  recordCompareVoteRemote,
  saveCompareVote,
} from '@/features/compare/compareScoreboard'
import { consumeSseStream } from '@/lib/sseParser'
import type { CompareStartResponse, ModelOption } from '@/api/types'

export interface ComparePaneState {
  content: string
  isStreaming: boolean
  done: boolean
  label: string
}

export interface CompareRunState {
  compId: string | null
  response: CompareStartResponse | null
  left: ComparePaneState
  right: ComparePaneState
  voted: boolean
  revealed: { left: string; right: string } | null
  isBlind: boolean
  lastPrompt?: string
}

const emptyPane = (label: string): ComparePaneState => ({
  content: '',
  isStreaming: false,
  done: false,
  label,
})

function streamPane(
  sessionId: string,
  prompt: string,
  side: 'left' | 'right',
  onUpdate: (side: 'left' | 'right', content: string, done: boolean) => void,
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
            onUpdate(side, text, false)
          } else if (event.type === 'error') {
            onUpdate(side, `Error: ${event.message}`, true)
          }
        },
        signal,
      )
      onUpdate(side, text, true)
    } catch (err) {
      if (!signal.aborted) {
        onUpdate(side, `Error: ${err instanceof Error ? err.message : 'Stream failed'}`, true)
      }
    }
  })()
}

export function useCompare() {
  const queryClient = useQueryClient()
  const [state, setState] = useState<CompareRunState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setIsRunning(false)
  }, [])

  const runCompare = useCallback(
    async (
      prompt: string,
      modelLeft: ModelOption,
      modelRight: ModelOption,
      isBlind = true,
    ) => {
      const trimmed = prompt.trim()
      if (!trimmed) {
        toast.error('Enter a prompt to compare')
        return
      }
      if (modelLeft.id === modelRight.id && modelLeft.endpointId === modelRight.endpointId) {
        toast.error('Select two different models')
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setIsRunning(true)

      try {
        const response = await startComparison({
          prompt: trimmed,
          modelA: modelLeft.id,
          modelB: modelRight.id,
          endpointA: modelLeft.url,
          endpointB: modelRight.url,
          isBlind,
        })

        const labels = resolveComparePaneLabels(isBlind, response)

        setState({
          compId: response.id,
          response,
          left: emptyPane(labels.left),
          right: emptyPane(labels.right),
          voted: false,
          revealed: null,
          isBlind,
          lastPrompt: trimmed,
        })

        setState((prev) =>
          prev
            ? {
                ...prev,
                left: { ...prev.left, isStreaming: true },
                right: { ...prev.right, isStreaming: true },
              }
            : prev,
        )

        const onUpdate = (side: 'left' | 'right', content: string, done: boolean) => {
          setState((prev) => {
            if (!prev) return prev
            const pane = side === 'left' ? prev.left : prev.right
            const nextPane = {
              ...pane,
              content,
              isStreaming: !done,
              done: done || pane.done,
            }
            return side === 'left'
              ? { ...prev, left: nextPane }
              : { ...prev, right: nextPane }
          })
        }

        await Promise.all([
          streamPane(response.session_left, trimmed, 'left', onUpdate, controller.signal),
          streamPane(response.session_right, trimmed, 'right', onUpdate, controller.signal),
        ])
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Compare failed')
      } finally {
        setIsRunning(false)
      }
    },
    [],
  )

  const submitVote = useCallback(async (winner: 'left' | 'right' | 'tie') => {
    if (!state?.compId || state.voted) return
    try {
      const result = await voteComparison(state.compId, winner)
      setState((prev) =>
        prev
          ? {
              ...prev,
              voted: true,
              revealed: result.revealed,
              left: { ...prev.left, label: result.revealed.left },
              right: { ...prev.right, label: result.revealed.right },
            }
          : prev,
      )
      const winnerName =
        winner === 'tie'
          ? 'tie'
          : winner === 'left'
            ? result.revealed.left
            : result.revealed.right
      saveCompareVote({
        models: [result.revealed.left, result.revealed.right],
        winner: winnerName,
        prompt: state.lastPrompt,
        blind: state.isBlind,
        mode: 'chat',
        timestamp: Date.now(),
      })
      recordCompareVoteRemote({
        prompt: state.lastPrompt ?? '',
        models: [result.revealed.left, result.revealed.right],
        winner: winnerName,
        is_blind: state.isBlind,
      })
      toast.success('Vote recorded')
      queryClient.invalidateQueries({ queryKey: ['compare-history'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Vote failed')
    }
  }, [state, queryClient])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(null)
    setIsRunning(false)
  }, [])

  return { state, isRunning, runCompare, submitVote, stop, reset }
}
