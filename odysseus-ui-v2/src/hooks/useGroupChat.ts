import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  createNamedSession,
  injectMessages,
  streamSessionMessage,
} from '@/api/groupChat'
import type { GroupMode, GroupParticipant, GroupTurn } from '@/api/types'
import {
  buildGroupSystemPrompt,
  formatPeerMessage,
  participantLabel,
  shuffleIndices,
} from '@/lib/groupChatHelpers'

function turnId() {
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function useGroupChat() {
  const [active, setActive] = useState(false)
  const [mode, setMode] = useState<GroupMode>('round-robin')
  const [participants, setParticipants] = useState<GroupParticipant[]>([])
  const [turns, setTurns] = useState<GroupTurn[]>([])
  const [isStreaming, setIsStreaming] = useState(false)

  const parentSessionRef = useRef<string | null>(null)
  const sessionIdsRef = useRef<(string | null)[]>([])
  const abortRef = useRef<AbortController[]>([])

  const abortStreaming = useCallback(() => {
    abortRef.current.forEach((ac) => ac.abort())
    abortRef.current = []
    setIsStreaming(false)
  }, [])

  const stop = useCallback(() => {
    abortStreaming()
    setActive(false)
    parentSessionRef.current = null
    sessionIdsRef.current = []
  }, [abortStreaming])

  const start = useCallback(
    async (picked: GroupParticipant[], chatMode: GroupMode) => {
      if (picked.length < 2) {
        toast.error('Pick at least two models')
        return false
      }

      setIsStreaming(true)
      try {
        const groupName = `[GRP] ${picked.map(participantLabel).join(', ')}`
        const parent = await createNamedSession(groupName, {
          url: picked[0].url,
          modelId: picked[0].modelId,
          endpointId: picked[0].endpointId,
        })
        parentSessionRef.current = parent.id

        const sessionIds: (string | null)[] = []
        for (const p of picked) {
          try {
            const sess = await createNamedSession(`[GRP] ${participantLabel(p)}`, {
              url: p.url,
              modelId: p.modelId,
              endpointId: p.endpointId,
            })
            sessionIds.push(sess.id)
            await injectMessages(sess.id, [
              { role: 'system', content: buildGroupSystemPrompt(p, picked) },
            ])
          } catch {
            sessionIds.push(null)
          }
        }

        sessionIdsRef.current = sessionIds
        setParticipants(picked)
        setMode(chatMode)
        setTurns([])
        setActive(true)
        toast.success(`Group chat started (${chatMode})`)
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not start group chat')
        return false
      } finally {
        setIsStreaming(false)
      }
    },
    [],
  )

  const updateResponse = useCallback(
    (turnKey: string, participantId: string, patch: Partial<GroupTurn['responses'][0]>) => {
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id !== turnKey
            ? turn
            : {
                ...turn,
                responses: turn.responses.map((r) =>
                  r.participantId === participantId ? { ...r, ...patch } : r,
                ),
              },
        ),
      )
    },
    [],
  )

  const streamOne = useCallback(
    async (
      turnKey: string,
      participant: GroupParticipant,
      sessionId: string | null,
      message: string,
      controller: AbortController,
    ): Promise<string> => {
      if (!sessionId) {
        updateResponse(turnKey, participant.id, {
          content: '[Session unavailable]',
          isStreaming: false,
        })
        return ''
      }

      updateResponse(turnKey, participant.id, { content: '', isStreaming: true })
      try {
        const text = await streamSessionMessage(sessionId, message, controller.signal)
        updateResponse(turnKey, participant.id, { content: text, isStreaming: false })
        return text
      } catch (err) {
        if (controller.signal.aborted) return ''
        const msg = err instanceof Error ? err.message : 'Stream failed'
        updateResponse(turnKey, participant.id, { content: `[Error: ${msg}]`, isStreaming: false })
        return ''
      }
    },
    [updateResponse],
  )

  const syncPeerResponses = useCallback(
    async (sourceIdx: number, sourceLabel: string, response: string) => {
      if (!response.trim()) return
      const syncMsg = formatPeerMessage(sourceLabel, response)
      const tasks = sessionIdsRef.current.map(async (sid, j) => {
        if (j === sourceIdx || !sid) return
        try {
          await injectMessages(sid, [{ role: 'user', content: syncMsg }])
        } catch {
          /* best effort */
        }
      })
      await Promise.all(tasks)
    },
    [],
  )

  const sendMessage = useCallback(
    async (message: string) => {
      const trimmed = message.trim()
      if (!trimmed || !active || isStreaming || participants.length === 0) return

      const parentId = parentSessionRef.current
      if (parentId) {
        void injectMessages(parentId, [{ role: 'user', content: trimmed }]).catch(() => {})
      }

      const turnKey = turnId()
      const initialResponses = participants.map((p) => ({
        participantId: p.id,
        label: participantLabel(p),
        content: '',
        isStreaming: false,
      }))
      setTurns((prev) => [...prev, { id: turnKey, userMessage: trimmed, responses: initialResponses }])
      setIsStreaming(true)

      try {
        if (mode === 'parallel') {
          const controllers = participants.map(() => new AbortController())
          abortRef.current = controllers
          const results = await Promise.all(
            participants.map((p, i) =>
              streamOne(turnKey, p, sessionIdsRef.current[i] ?? null, trimmed, controllers[i]),
            ),
          )
          abortRef.current = []
          await Promise.all(
            participants.map((p, i) =>
              syncPeerResponses(i, participantLabel(p), results[i] ?? ''),
            ),
          )
        } else {
          const order = shuffleIndices(participants.length)
          for (const idx of order) {
            const p = participants[idx]
            const controller = new AbortController()
            abortRef.current = [controller]
            const text = await streamOne(
              turnKey,
              p,
              sessionIdsRef.current[idx] ?? null,
              trimmed,
              controller,
            )
            abortRef.current = []
            await syncPeerResponses(idx, participantLabel(p), text)
          }
        }
      } finally {
        setIsStreaming(false)
      }
    },
    [active, isStreaming, mode, participants, streamOne, syncPeerResponses],
  )

  return {
    active,
    mode,
    setMode,
    participants,
    setParticipants,
    turns,
    isStreaming,
    start,
    stop,
    abortStreaming,
    sendMessage,
  }
}
