import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { postChatStream } from '@/api/chat'
import { startComparison, voteComparison } from '@/api/compare'
import { consumeSseStream } from '@/lib/sseParser'
import type { CompareStartResponse, ModelOption } from '@/api/types'

export interface ComparePaneState {
  content: string
  isStreaming: boolean
  done: boolean
  label: string
}

export interface CompareInChatState {
  compId: string | null
  response: CompareStartResponse | null
  left: ComparePaneState
  right: ComparePaneState
  voted: boolean
  revealed: { left: string; right: string } | null
  round: number
  blindMode: boolean
  lastPrompt: string
}

const emptyPane = (label: string): ComparePaneState => ({
  content: '',
  isStreaming: false,
  done: false,
  label,
})

function streamComparePane(
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

export function useCompareInChat() {
  const [active, setActive] = useState(false)
  const [state, setState] = useState<CompareInChatState | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const sessionsRef = useRef<{ left: string; right: string } | null>(null)
  const blindRef = useRef(true)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  const close = useCallback(() => {
    stop()
    setActive(false)
    setState(null)
    sessionsRef.current = null
  }, [stop])

  const setBlindMode = useCallback((blind: boolean) => {
    blindRef.current = blind
    setState((prev) => (prev ? { ...prev, blindMode: blind } : prev))
  }, [])

  const shufflePanes = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      const nextLeft = { ...prev.right, label: prev.blindMode ? 'Model A' : prev.right.label }
      const nextRight = { ...prev.left, label: prev.blindMode ? 'Model B' : prev.left.label }
      return {
        ...prev,
        left: nextLeft,
        right: nextRight,
        blindMode: true,
        voted: false,
        revealed: null,
      }
    })
    if (sessionsRef.current) {
      const { left, right } = sessionsRef.current
      sessionsRef.current = { left: right, right: left }
    }
    blindRef.current = true
    toast.message('Panes shuffled · blind mode on')
  }, [])

  const runPrompt = useCallback(
    async (
      prompt: string,
      modelLeft: ModelOption,
      modelRight: ModelOption,
      options?: { isBlind?: boolean; followUp?: boolean },
    ) => {
      const trimmed = prompt.trim()
      if (!trimmed) return

      const isBlind = options?.isBlind ?? blindRef.current
      const followUp = options?.followUp ?? Boolean(sessionsRef.current && state?.voted)

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setIsStreaming(true)
      setActive(true)

      try {
        let compId = state?.compId
        const round = followUp && state ? state.round + 1 : (state?.round ?? 1)

        if (!sessionsRef.current || !followUp) {
          const started = await startComparison({
            prompt: trimmed,
            modelA: modelLeft.id,
            modelB: modelRight.id,
            endpointA: modelLeft.url,
            endpointB: modelRight.url,
            isBlind,
          })
          compId = started.id
          sessionsRef.current = {
            left: started.session_left,
            right: started.session_right,
          }
          setState({
            compId,
            response: started,
            left: emptyPane(isBlind ? 'Model A' : (started.model_left ?? 'Model A')),
            right: emptyPane(isBlind ? 'Model B' : (started.model_right ?? 'Model B')),
            voted: false,
            revealed: null,
            round: 1,
            blindMode: isBlind,
            lastPrompt: trimmed,
          })
        } else {
          setState((prev) =>
            prev
              ? {
                  ...prev,
                  round,
                  lastPrompt: trimmed,
                  left: {
                    ...emptyPane(prev.blindMode ? 'Model A' : prev.left.label),
                    isStreaming: true,
                  },
                  right: {
                    ...emptyPane(prev.blindMode ? 'Model B' : prev.right.label),
                    isStreaming: true,
                  },
                  voted: false,
                  revealed: null,
                  blindMode: isBlind,
                }
              : prev,
          )
        }

        const sessions = sessionsRef.current
        if (!sessions) return

        const onUpdate = (side: 'left' | 'right', content: string, done: boolean) => {
          setState((prev) => {
            if (!prev) return prev
            const pane = side === 'left' ? prev.left : prev.right
            const nextPane = { ...pane, content, isStreaming: !done, done: done || pane.done }
            return side === 'left' ? { ...prev, left: nextPane } : { ...prev, right: nextPane }
          })
        }

        await Promise.all([
          streamComparePane(sessions.left, trimmed, 'left', onUpdate, controller.signal),
          streamComparePane(sessions.right, trimmed, 'right', onUpdate, controller.signal),
        ])
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Compare failed')
      } finally {
        setIsStreaming(false)
      }
    },
    [state],
  )

  const submitVote = useCallback(
    async (winner: 'left' | 'right' | 'tie') => {
      if (!state?.compId || state.voted) return
      try {
        const result = await voteComparison(state.compId, winner)
        setState((prev) =>
          prev
            ? {
                ...prev,
                voted: true,
                blindMode: false,
                revealed: result.revealed,
                left: { ...prev.left, label: result.revealed.left },
                right: { ...prev.right, label: result.revealed.right },
              }
            : prev,
        )
        blindRef.current = false
        toast.success('Vote recorded — send another message for the next round')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Vote failed')
      }
    },
    [state],
  )

  return {
    active,
    state,
    isStreaming,
    runPrompt,
    submitVote,
    shufflePanes,
    setBlindMode,
    stop,
    close,
    setActive,
  }
}
