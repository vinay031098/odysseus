import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  fetchHistory,
  getChatResume,
  getStreamStatus,
  postChatStream,
  stopChatStream,
  updateLastMeta,
} from '@/api/chat'
import { deleteMessages, forkSession, truncateSession } from '@/api/sessions'
import {
  CHECKLIST_RE,
  getStoredPlan,
  looksLikePlan,
  PLAN_APPROVE_MESSAGE,
  setStoredPlan,
} from '@/lib/chatPlan'
import {
  getBashEnabled,
  getChatMode,
  getWebEnabled,
  isPlanEnabled,
  isResearchEnabled,
} from '@/lib/chatToggles'
import {
  getVariantIndex,
  hydrateMessagesWithVariants,
  nextVariantLabel,
  parseVariants,
  serializeVariants,
  type MessageVariant,
} from '@/lib/messageVariants'
import { getWorkspaceFolder } from '@/lib/workspaceFolder'
import { consumeSseStream, isRichStreamEvent } from '@/lib/sseParser'
import { acquireStreamLock, releaseStreamLock } from '@/lib/streamLock'
import { messageDbId } from '@/lib/chatSessions'
import { dispatchUiControlToggle } from '@/lib/uiControlEvents'
import type { AskUserPayload, ChatMessage, PendingChat, StreamEvent, StreamLiveState } from '@/api/types'

export interface DocStreamCallbacks {
  onDocStreamOpen?: (data: { title?: string; language?: string }) => void
  onDocStreamDelta?: (data: { content?: string }) => void
  onDocUpdate?: (data: {
    doc_id: string
    content?: string
    title?: string
    language?: string
    version?: number
  }) => void
  onDocSuggestions?: (data: { doc_id?: string; suggestions: import('@/api/types').DocSuggestion[] }) => void
}

export interface SendOptions {
  sessionId: string | null
  pending: PendingChat | null
  materialize: (pending: PendingChat, options?: { incognito?: boolean }) => Promise<string>
  attachments?: string[]
  useRag?: boolean
  incognito?: boolean
  hideUserBubble?: boolean
  mode?: 'chat' | 'agent'
  useWeb?: boolean
  allowBash?: boolean
  planMode?: boolean
  forcePlanOff?: boolean
  approvedPlan?: string
  activeDocId?: string | null
  docPanelOpen?: boolean
  presetId?: string | null
  onUiControl?: (event: StreamEvent) => void
  onDocStream?: DocStreamCallbacks
}

export interface PendingPlan {
  sessionId: string
  text: string
}

const emptyLive: StreamLiveState = { isRich: false }

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [streamLive, setStreamLive] = useState<StreamLiveState>(emptyLive)
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null)
  const [pendingAskUser, setPendingAskUser] = useState<AskUserPayload | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const activeSessionRef = useRef<string | null>(null)
  const hideUserBubbleRef = useRef(false)
  const pendingAttachmentsRef = useRef<string[]>([])
  const planTurnRef = useRef(false)
  const forcePlanOffRef = useRef(false)
  const pendingVariantsRef = useRef<MessageVariant[] | null>(null)

  const applyStreamEvent = useCallback(
    (event: StreamEvent, assistantText: { current: string }, options?: Pick<SendOptions, 'onUiControl' | 'onDocStream'>) => {
      if (event.type === 'delta') {
        assistantText.current += event.text
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, content: assistantText.current }
          }
          return next
        })
        return
      }

      if (event.type === 'thinking') {
        setStreamLive((s) => ({ ...s, thinking: (s.thinking ?? '') + event.text, isRich: true }))
        return
      }

      if (event.type === 'tool_start') {
        setStreamLive((s) => ({
          ...s,
          statusText: event.label ?? `Running ${event.name}…`,
          isRich: true,
        }))
        return
      }

      if (event.type === 'tool_progress') {
        setStreamLive((s) => ({ ...s, statusText: event.message, isRich: true }))
        return
      }

      if (event.type === 'agent_step') {
        setStreamLive((s) => ({
          ...s,
          statusText: event.label ?? 'Agent step…',
          isRich: true,
        }))
        return
      }

      if (event.type === 'research_progress') {
        const label =
          event.phase === 'reading' && event.title
            ? `Reading: ${event.title}`
            : event.phase === 'writing'
              ? `Writing report · ${event.total_sources ?? 0} sources`
              : 'Research in progress…'
        setStreamLive((s) => ({ ...s, statusText: label, isRich: true }))
        return
      }

      if (event.type === 'web_sources' && Array.isArray(event.data)) {
        const data = event.data as import('@/api/types').WebSource[]
        setStreamLive((s) => ({
          ...s,
          webSources: data,
          isRich: true,
        }))
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = {
              ...last,
              metadata: { ...last.metadata, web_sources: data },
            }
          }
          return next
        })
        return
      }

      if (event.type === 'research_sources' && Array.isArray(event.data)) {
        const data = event.data as import('@/api/types').WebSource[]
        setStreamLive((s) => ({
          ...s,
          researchSources: data,
          isRich: true,
        }))
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = {
              ...last,
              metadata: { ...last.metadata, research_sources: data },
            }
          }
          return next
        })
        return
      }

      if (event.type === 'rag_sources') {
        setStreamLive((s) => ({ ...s, ragSources: event.data as StreamLiveState['ragSources'], isRich: true }))
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = {
              ...last,
              metadata: { ...last.metadata, rag_sources: event.data },
            }
          }
          return next
        })
        return
      }

      if (event.type === 'ui_control') {
        options?.onUiControl?.(event)
        if (event.toggle_name === 'rag' && typeof event.state === 'boolean') {
          dispatchUiControlToggle('rag', event.state)
        } else if (event.toggle_name === 'incognito' && typeof event.state === 'boolean') {
          dispatchUiControlToggle('incognito', event.state)
        }
        return
      }

      if (event.type === 'doc_stream_open') {
        options?.onDocStream?.onDocStreamOpen?.({
          title: event.title,
          language: event.language,
        })
        setStreamLive((s) => ({ ...s, statusText: 'Writing document…', isRich: true }))
        return
      }

      if (event.type === 'doc_stream_delta') {
        options?.onDocStream?.onDocStreamDelta?.({ content: event.content })
        return
      }

      if (event.type === 'doc_update') {
        options?.onDocStream?.onDocUpdate?.({
          doc_id: event.doc_id,
          content: event.content,
          title: event.title,
          language: event.language,
          version: event.version,
        })
        return
      }

      if (event.type === 'doc_suggestions') {
        options?.onDocStream?.onDocSuggestions?.({
          doc_id: event.doc_id,
          suggestions: event.suggestions,
        })
        return
      }

      if (event.type === 'ask_user') {
        setPendingAskUser(event.data)
        return
      }

      if (event.type === 'error') {
        toast.error(event.message)
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant' && !last.content) {
            next[next.length - 1] = { ...last, content: `Error: ${event.message}` }
          }
          return next
        })
        return
      }

      if (isRichStreamEvent(event)) {
        setStreamLive((s) => ({ ...s, isRich: true }))
      }
    },
    [],
  )

  const finalizeAssistantMessage = useCallback(
    async (sessionId: string, assistantText: string, live: StreamLiveState, planTurn: boolean) => {
      if (assistantText && CHECKLIST_RE.test(assistantText)) {
        setStoredPlan(sessionId, assistantText)
      }
      if (planTurn && assistantText.trim() && looksLikePlan(assistantText)) {
        setPendingPlan({ sessionId, text: assistantText })
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = {
              ...last,
              metadata: { ...last.metadata, plan_pending: true },
            }
          }
          return next
        })
      }

      const variants = pendingVariantsRef.current
      if (variants && variants.length > 0 && assistantText.trim()) {
        const label = nextVariantLabel(variants.length)
        const allVariants = [...variants, { content: assistantText, label }]
        pendingVariantsRef.current = null
        const serialized = serializeVariants(allVariants)
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = {
              ...last,
              metadata: {
                ...last.metadata,
                variants: serialized,
                variantIndex: allVariants.length - 1,
              },
            }
          }
          return next
        })
        void updateLastMeta(sessionId, {
          variants: serialized,
          variantIndex: allVariants.length - 1,
        }).catch(() => {})
      }

      if (live.isRich) {
        try {
          const data = await fetchHistory(sessionId)
          setMessages(hydrateMessagesWithVariants(data.history ?? []))
        } catch {
          /* keep streamed view */
        }
      }
    },
    [],
  )

  const consumeStream = useCallback(
    async (
      response: Response,
      controller: AbortController,
      sessionId: string,
      options?: Pick<SendOptions, 'onUiControl' | 'onDocStream'>,
    ) => {
      const assistantText = { current: '' }
      let live: StreamLiveState = { isRich: false }
      const planTurn = planTurnRef.current
      planTurnRef.current = false

      setStreamLive(emptyLive)

      await consumeSseStream(
        response,
        (event) => {
          if (isRichStreamEvent(event)) {
            live = { ...live, isRich: true }
          }
          applyStreamEvent(event, assistantText, options)
        },
        controller.signal,
      )

      setStreamLive((s) => {
        live = { ...s, ...live }
        return emptyLive
      })

      activeSessionRef.current = sessionId
      await finalizeAssistantMessage(sessionId, assistantText.current, live, planTurn)
    },
    [applyStreamEvent, finalizeAssistantMessage],
  )

  const tryResumeStream = useCallback(
    async (sessionId: string, options?: Pick<SendOptions, 'onUiControl' | 'onDocStream'>) => {
      const status = await getStreamStatus(sessionId).catch(() => ({ status: 'idle' }))
      if (status.status !== 'streaming' && !('detached' in status && status.detached)) return false

      const controller = new AbortController()
      abortRef.current = controller
      activeSessionRef.current = sessionId

      let res: Response
      try {
        res = await getChatResume(sessionId, controller.signal)
      } catch {
        return false
      }
      if (!res.ok || !res.body) return false

      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant') return prev
        return [...prev, { role: 'assistant', content: '' }]
      })
      setIsStreaming(true)
      await consumeStream(res, controller, sessionId, options)
      setIsStreaming(false)
      abortRef.current = null
      return true
    },
    [consumeStream],
  )

  const loadHistory = useCallback(
    async (sessionId: string, options?: Pick<SendOptions, 'onUiControl' | 'onDocStream'>) => {
      setIsLoadingHistory(true)
      setPendingPlan(null)
      try {
        const data = await fetchHistory(sessionId)
        setMessages(hydrateMessagesWithVariants(data.history ?? []))
        const resumed = await tryResumeStream(sessionId, options)
        if (resumed) return
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load history')
        setMessages([])
      } finally {
        setIsLoadingHistory(false)
      }
    },
    [tryResumeStream],
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    setPendingPlan(null)
    setStreamLive(emptyLive)
  }, [])

  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const appendLocalSlashReply = useCallback(
    (userText: string, reply: string, opts?: { hideUser?: boolean; typewriter?: boolean }) => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current)
        typewriterRef.current = null
      }

      if (!opts?.typewriter) {
        setMessages((prev) => {
          const next = [...prev]
          if (!opts?.hideUser && userText) {
            next.push({ role: 'user', content: userText, metadata: { source: 'slash' } })
          }
          next.push({ role: 'assistant', content: reply, metadata: { source: 'slash' } })
          return next
        })
        return
      }

      setMessages((prev) => {
        const next = [...prev]
        if (!opts?.hideUser && userText) {
          next.push({ role: 'user', content: userText, metadata: { source: 'slash' } })
        }
        next.push({ role: 'assistant', content: '', metadata: { source: 'slash', typewriter: true } })
        return next
      })

      let i = 0
      typewriterRef.current = setInterval(() => {
        i += 1
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role !== 'assistant') return prev
          next[next.length - 1] = {
            ...last,
            content: reply.slice(0, i),
            metadata: { ...last.metadata, typewriter: i < reply.length },
          }
          return next
        })
        if (i >= reply.length && typewriterRef.current) {
          clearInterval(typewriterRef.current)
          typewriterRef.current = null
        }
      }, 10)
    },
    [],
  )

  const stop = useCallback(async () => {
    abortRef.current?.abort()
    releaseStreamLock()
    const sid = activeSessionRef.current
    if (sid) {
      try {
        await stopChatStream(sid)
      } catch {
        /* best effort */
      }
    }
    setIsStreaming(false)
    setStreamLive(emptyLive)
  }, [])

  const sendMessage = useCallback(
    async (text: string, options: SendOptions) => {
      const trimmed = text.trim()
      const attachmentIds = options.attachments?.length
        ? options.attachments
        : pendingAttachmentsRef.current
      if ((!trimmed && !attachmentIds.length) || isStreaming) return null

      let sessionId = options.sessionId
      if (!sessionId && options.pending) {
        sessionId = await options.materialize(options.pending, {
          incognito: options.incognito,
        })
      }
      if (!sessionId) {
        toast.error('Select a model to start chatting')
        return null
      }

      activeSessionRef.current = sessionId
      const hideBubble = options.hideUserBubble || hideUserBubbleRef.current
      hideUserBubbleRef.current = false

      const mode = options.mode ?? getChatMode()
      const useWeb = options.useWeb ?? getWebEnabled(mode)
      const allowBash = options.allowBash ?? getBashEnabled(mode)
      const planEnabled = options.planMode ?? isPlanEnabled()
      const effectiveMode = planEnabled ? 'agent' : mode
      const forcePlanOff = options.forcePlanOff ?? forcePlanOffRef.current
      forcePlanOffRef.current = false

      const planTurn = !forcePlanOff && effectiveMode === 'agent' && planEnabled
      planTurnRef.current = planTurn

      if (!hideBubble) {
        const userMsg: ChatMessage = {
          role: 'user',
          content: trimmed || `[${attachmentIds.length} attachment(s)]`,
        }
        setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }])
      } else {
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant') return prev
          return [...prev, { role: 'assistant', content: '' }]
        })
      }
      setIsStreaming(true)
      setPendingPlan(null)
      setPendingAskUser(null)

      const controller = new AbortController()
      abortRef.current = controller

      const fd = new FormData()
      fd.append('message', trimmed)
      fd.append('session', sessionId)
      fd.append('mode', effectiveMode)
      if (attachmentIds.length) fd.append('attachments', JSON.stringify(attachmentIds))
      if (options.useRag === false) fd.append('use_rag', 'false')
      if (options.incognito) fd.append('incognito', 'true')
      if (isResearchEnabled()) fd.append('use_research', 'true')
      if (useWeb) {
        if (effectiveMode === 'agent') fd.append('allow_web_search', 'true')
        else fd.append('use_web', 'true')
      }
      if (allowBash) fd.append('allow_bash', 'true')
      const workspace = getWorkspaceFolder()
      if (workspace) fd.append('workspace', workspace)
      if (planTurn) {
        fd.append('plan_mode', 'true')
      } else if (effectiveMode === 'agent') {
        const approved = options.approvedPlan ?? getStoredPlan(sessionId)
        if (approved) fd.append('approved_plan', approved)
      }
      if (options.docPanelOpen && options.activeDocId) {
        fd.append('active_doc_id', options.activeDocId)
      }
      if (options.presetId) {
        fd.append('preset_id', options.presetId)
      }

      pendingAttachmentsRef.current = []

      acquireStreamLock(sessionId)

      try {
        const response = await postChatStream(fd, controller.signal)
        await consumeStream(response, controller, sessionId, options)
      } catch (err) {
        if (!controller.signal.aborted) {
          toast.error(err instanceof Error ? err.message : 'Chat failed')
        }
      } finally {
        releaseStreamLock()
        setIsStreaming(false)
        setStreamLive(emptyLive)
        abortRef.current = null
      }

      return sessionId
    },
    [consumeStream, isStreaming],
  )

  const approvePlan = useCallback(
    async (sessionId: string, planText: string, sendOpts: Omit<SendOptions, 'sessionId'>) => {
      setStoredPlan(sessionId, planText)
      setPendingPlan(null)
      forcePlanOffRef.current = true
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant') {
          next[next.length - 1] = {
            ...last,
            metadata: { ...last.metadata, plan_pending: false },
          }
        }
        return [...next, { role: 'user', content: 'Approved the plan.' }]
      })
      hideUserBubbleRef.current = true
      await sendMessage(PLAN_APPROVE_MESSAGE, {
        ...sendOpts,
        sessionId,
        forcePlanOff: true,
        approvedPlan: planText,
        hideUserBubble: true,
      })
    },
    [sendMessage],
  )

  const truncateAndReload = useCallback(async (sessionId: string, keepCount: number) => {
    await truncateSession(sessionId, keepCount)
    const data = await fetchHistory(sessionId)
    setMessages(hydrateMessagesWithVariants(data.history ?? []))
  }, [])

  const deleteMessageAt = useCallback(
    async (sessionId: string | null, index: number) => {
      if (!sessionId) {
        setMessages((prev) => prev.filter((_, i) => i !== index && i !== index + 1))
        toast.success('Message deleted')
        return
      }

      const msg = messages[index]
      const next = messages[index + 1]
      const ids: string[] = []
      const userId = messageDbId(msg)
      const aiId = next?.role === 'assistant' ? messageDbId(next) : null
      if (userId) ids.push(userId)
      if (aiId) ids.push(aiId)

      try {
        if (ids.length) {
          await deleteMessages(sessionId, ids)
        } else {
          await truncateSession(sessionId, index)
        }
        await loadHistory(sessionId)
        toast.success('Message deleted')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Delete failed')
      }
    },
    [loadHistory, messages],
  )

  const editUserMessage = useCallback(
    async (sessionId: string, index: number, newText: string, sendOpts: Omit<SendOptions, 'sessionId'>) => {
      const trimmed = newText.trim()
      if (!trimmed) return
      try {
        await truncateSession(sessionId, index)
        hideUserBubbleRef.current = false
        await sendMessage(trimmed, { ...sendOpts, sessionId, pending: null, materialize: async () => sessionId })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Edit failed')
      }
    },
    [sendMessage],
  )

  const regenerateFrom = useCallback(
    async (sessionId: string, aiIndex: number, sendOpts: Omit<SendOptions, 'sessionId'>) => {
      let userIndex = -1
      let userText = ''
      for (let i = aiIndex - 1; i >= 0; i--) {
        if (messages[i]?.role === 'user') {
          userIndex = i
          userText = messages[i].content
          break
        }
      }
      if (userIndex < 0) {
        toast.error('Could not find the user message to regenerate')
        return
      }

      const aiMsg = messages[aiIndex]
      let variants = parseVariants(aiMsg?.metadata)
      if (variants.length === 0 && aiMsg?.content) {
        variants = [{ content: aiMsg.content, label: 'original' }]
      } else if (variants.length > 0) {
        const idx = getVariantIndex(aiMsg?.metadata, variants.length - 1)
        variants = variants.map((v, i) =>
          i === idx && aiMsg?.content ? { ...v, content: aiMsg.content } : v,
        )
      }
      pendingVariantsRef.current = variants

      try {
        await truncateSession(sessionId, userIndex)
        setMessages((prev) => prev.slice(0, userIndex + 1))
        hideUserBubbleRef.current = true
        await sendMessage(userText, {
          ...sendOpts,
          sessionId,
          pending: null,
          materialize: async () => sessionId,
          hideUserBubble: true,
        })
      } catch (err) {
        pendingVariantsRef.current = null
        toast.error(err instanceof Error ? err.message : 'Regenerate failed')
      }
    },
    [messages, sendMessage],
  )

  const resendUserMessage = useCallback(
    async (sessionId: string, userIndex: number, sendOpts: Omit<SendOptions, 'sessionId'>) => {
      const userText = messages[userIndex]?.content ?? ''
      try {
        await truncateSession(sessionId, userIndex)
        setMessages((prev) => prev.slice(0, userIndex + 1))
        hideUserBubbleRef.current = true
        await sendMessage(userText, {
          ...sendOpts,
          sessionId,
          pending: null,
          materialize: async () => sessionId,
          hideUserBubble: true,
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Resend failed')
      }
    },
    [messages, sendMessage],
  )

  const switchVariant = useCallback(
    async (sessionId: string, aiIndex: number, newIndex: number) => {
      const msg = messages[aiIndex]
      const variants = parseVariants(msg?.metadata)
      if (newIndex < 0 || newIndex >= variants.length) return
      const chosen = variants[newIndex]
      setMessages((prev) => {
        const next = [...prev]
        const current = next[aiIndex]
        if (!current) return prev
        next[aiIndex] = {
          ...current,
          content: chosen.content,
          metadata: { ...current.metadata, variantIndex: newIndex },
        }
        return next
      })
      void updateLastMeta(sessionId, { variantIndex: newIndex }).catch(() => {})
    },
    [messages],
  )

  const forkFrom = useCallback(async (sessionId: string, aiIndex: number) => {
    try {
      const result = await forkSession(sessionId, aiIndex + 1)
      toast.success('Forked to new session')
      return result.id
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fork failed')
      return null
    }
  }, [])

  const setPendingAttachments = useCallback((ids: string[]) => {
    pendingAttachmentsRef.current = ids
  }, [])

  const dismissAskUser = useCallback(() => {
    setPendingAskUser(null)
  }, [])

  return {
    messages,
    isStreaming,
    isLoadingHistory,
    streamLive,
    pendingPlan,
    pendingAskUser,
    loadHistory,
    clearMessages,
    sendMessage,
    approvePlan,
    stop,
    deleteMessageAt,
    editUserMessage,
    regenerateFrom,
    resendUserMessage,
    switchVariant,
    forkFrom,
    truncateAndReload,
    setPendingAttachments,
    appendLocalSlashReply,
    dismissAskUser,
  }
}
