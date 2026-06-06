import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PREFILL_STORAGE_KEY } from '@/api/cookbook'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { GitCompare } from 'lucide-react'
import { toast } from 'sonner'
import {
  CharacterPresetDialog,
  CharacterPresetIndicator,
} from '@/components/chat/CharacterPresetPicker'
import { ChatComposer } from '@/components/chat/ChatComposer'
import { CompareInChatPanel } from '@/components/chat/CompareInChatPanel'
import {
  DocumentPanelDock,
  DocumentPanelToggle,
} from '@/components/chat/DocumentPanelDock'
import { MessageList } from '@/components/chat/MessageList'
import { ModelPicker } from '@/components/chat/ModelPicker'
import { OnboardingWizard } from '@/components/chat/OnboardingWizard'
import { PlanWindow } from '@/components/chat/PlanWindow'
import { SessionSearchDialog } from '@/components/chat/SessionSearchDialog'
import { SessionSidebar } from '@/components/chat/SessionSidebar'
import { updateSessionModel } from '@/api/sessions'
import { useSkillsIndex } from '@/hooks/useAgents'
import { useCharacterPreset } from '@/hooks/useCharacterPreset'
import { useChatStream, type DocStreamCallbacks } from '@/hooks/useChatStream'
import { useChatToggles } from '@/hooks/useChatToggles'
import { useCompareInChat } from '@/hooks/useCompareInChat'
import { useIncognito } from '@/hooks/useIncognito'
import { useKeybinds } from '@/hooks/useKeybinds'
import { useModels } from '@/hooks/useModels'
import { useSessions } from '@/hooks/useSessions'
import { useSessionDocuments } from '@/hooks/useSessionDocuments'
import { useTheme } from '@/hooks/useTheme'
import { getStoredPlan } from '@/lib/chatPlan'
import { handleChatUiControl } from '@/lib/chatUiControl'
import {
  applyDocSuggestion,
  createStreamingDocId,
  type StreamingDocument,
} from '@/lib/docStream'
import { ttsManager } from '@/lib/ttsManager'
import {
  getDocRestoreState,
  markDocVisibleState,
  PENDING_DOC_KEY,
} from '@/lib/documentKeys'
import { resolveSkillSlashMessage } from '@/lib/skillSlash'
import { handleSlashCommand, type SlashContext } from '@/lib/slashCommands'
import {
  readIncognitoPref,
  readRagActive,
  writeIncognitoPref,
  writeRagActive,
} from '@/lib/storageKeys'
import {
  initTourHintWatcher,
  markChatFirstVisitSeen,
  shouldShowChatFirstVisit,
} from '@/lib/tourHints'
import { KEYBIND_EVENTS } from '@/lib/keybind-events'
import {
  dispatchUiControlToggle,
  UI_CONTROL_EVENTS,
  type UiControlToggleDetail,
} from '@/lib/uiControlEvents'
import { sessionDocumentsKey } from '@/hooks/useSessionDocuments'
import type { DocSuggestion, ModelOption, PendingChat, StreamEvent } from '@/api/types'

function readPrefillFromStorage(): string | undefined {
  const stored = sessionStorage.getItem(PREFILL_STORAGE_KEY)
  if (stored) {
    sessionStorage.removeItem(PREFILL_STORAGE_KEY)
    return stored
  }
  return undefined
}

export function ChatPage() {
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const sessionId = routeSessionId ?? null
  const composerFocusRef = useRef<(() => void) | null>(null)

  const onSessionChange = useCallback(
    (id: string | null) => {
      if (id) navigate(`/chat/${id}`, { replace: true })
      else navigate('/chat', { replace: true })
    },
    [navigate],
  )

  const { modelOptions, defaultChat, hasModels, isConfigured, isLoading: modelsLoading } =
    useModels()
  const {
    sessions,
    archivedSessions,
    isLoading: sessionsLoading,
    pendingChat,
    startNewChat,
    selectSession,
    materializePending,
    deleteSession,
    renameSession,
    archiveSession,
    unarchiveSession,
    toggleImportant,
    moveToFolder,
  } = useSessions(sessionId, onSessionChange)

  const { incognitoIds, markIncognito, isIncognito: sessionIsIncognito } =
    useIncognito(sessionId)
  const { keybinds } = useKeybinds()
  const toggles = useChatToggles()
  const theme = useTheme()
  const chat = useChatStream()
  const characterPreset = useCharacterPreset(sessionId)
  const compare = useCompareInChat()
  const { data: skillsIndex = [] } = useSkillsIndex()
  const loadedSessionRef = useRef<string | null>(null)
  const [composerPrefill, setComposerPrefill] = useState<string | undefined>(readPrefillFromStorage)
  const [searchOpen, setSearchOpen] = useState(false)
  const [useRag, setUseRagState] = useState(() => readRagActive())
  const [incognito, setIncognitoState] = useState(() => readIncognitoPref())
  const setUseRag = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setUseRagState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      writeRagActive(next)
      return next
    })
  }, [])
  const setIncognito = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setIncognitoState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      writeIncognitoPref(next)
      return next
    })
  }, [])
  const [compareMode, setCompareMode] = useState(false)
  const [docPanelOpen, setDocPanelOpen] = useState(false)
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const docRestoreRef = useRef<string | null>(null)
  const [planWindowOpen, setPlanWindowOpen] = useState(false)
  const [presetDialogOpen, setPresetDialogOpen] = useState(false)
  const [streamingDoc, setStreamingDoc] = useState<StreamingDocument | null>(null)
  const [pendingDocSuggestions, setPendingDocSuggestions] = useState<DocSuggestion[] | null>(null)
  const streamingDocIdRef = useRef<string | null>(null)
  const [showChatBanner, setShowChatBanner] = useState(shouldShowChatFirstVisit)

  const { data: sessionDocs = [], isLoading: sessionDocsLoading } = useSessionDocuments(sessionId)

  useEffect(() => {
    initTourHintWatcher()
  }, [])

  useEffect(() => {
    const pendingId = localStorage.getItem(PENDING_DOC_KEY)
    if (pendingId && sessionId) {
      localStorage.removeItem(PENDING_DOC_KEY)
      setActiveDocId(pendingId)
      setDocPanelOpen(true)
      markDocVisibleState(sessionId, 'open')
      docRestoreRef.current = sessionId
      return
    }

    if (!sessionId) {
      setDocPanelOpen(false)
      setActiveDocId(null)
      docRestoreRef.current = null
      return
    }

    if (docRestoreRef.current === sessionId || sessionDocsLoading) return

    docRestoreRef.current = sessionId
    const { shouldOpen, shouldMinimize } = getDocRestoreState(sessionId)

    if (sessionDocs.length === 0) {
      setDocPanelOpen(shouldOpen)
      if (!shouldOpen) setActiveDocId(null)
      return
    }

    const targetDoc = sessionDocs[0]
    if (shouldMinimize && !shouldOpen) {
      setDocPanelOpen(false)
      setActiveDocId(targetDoc.id)
      return
    }

    markDocVisibleState(sessionId, 'open')
    setActiveDocId(targetDoc.id)
    setDocPanelOpen(true)
  }, [sessionId, sessionDocs, sessionDocsLoading])

  useEffect(() => {
    const stored = readPrefillFromStorage()
    if (stored) setComposerPrefill(stored)
  }, [location.key, location.state])

  const currentSession = useMemo(
    () =>
      sessions.find((s) => s.id === sessionId) ??
      archivedSessions.find((s) => s.id === sessionId),
    [sessions, archivedSessions, sessionId],
  )

  useEffect(() => {
    if (currentSession?.rag === false) setUseRag(false)
    else if (currentSession) setUseRag(true)
  }, [currentSession, setUseRag])

  useEffect(() => {
    if (sessionId) setIncognito(sessionIsIncognito)
  }, [sessionId, sessionIsIncognito, setIncognito])

  useEffect(() => {
    const onRagControl = (event: Event) => {
      const state = (event as CustomEvent<UiControlToggleDetail>).detail.state
      setUseRag(state)
    }
    const onIncognitoControl = (event: Event) => {
      const state = (event as CustomEvent<UiControlToggleDetail>).detail.state
      setIncognito(state)
    }
    window.addEventListener(UI_CONTROL_EVENTS.rag, onRagControl)
    window.addEventListener(UI_CONTROL_EVENTS.incognito, onIncognitoControl)
    return () => {
      window.removeEventListener(UI_CONTROL_EVENTS.rag, onRagControl)
      window.removeEventListener(UI_CONTROL_EVENTS.incognito, onIncognitoControl)
    }
  }, [setUseRag, setIncognito])

  const selectedModelId = useMemo(() => {
    if (pendingChat) return pendingChat.modelId
    if (currentSession?.model) return currentSession.model
    if (defaultChat?.model) return defaultChat.model
    return modelOptions[0]?.id ?? null
  }, [pendingChat, currentSession, defaultChat, modelOptions])

  const selectedModel = useMemo(
    () => modelOptions.find((m) => m.id === selectedModelId) ?? modelOptions[0] ?? null,
    [modelOptions, selectedModelId],
  )

  const compareRightModel = useMemo(() => {
    return modelOptions.find((m) => m.id !== selectedModel?.id) ?? modelOptions[1] ?? null
  }, [modelOptions, selectedModel])

  const activePending: PendingChat | null = useMemo(() => {
    if (pendingChat) return pendingChat
    if (sessionId) return null
    if (defaultChat?.model && defaultChat.endpoint_url) {
      return {
        url: defaultChat.endpoint_url,
        modelId: defaultChat.model,
        endpointId: defaultChat.endpoint_id,
      }
    }
    const first = modelOptions[0]
    if (first) {
      return { url: first.url, modelId: first.id, endpointId: first.endpointId }
    }
    return null
  }, [pendingChat, sessionId, defaultChat, modelOptions])

  const docStreamCallbacks: DocStreamCallbacks = useMemo(
    () => ({
      onDocStreamOpen: ({ title, language }) => {
        const id = createStreamingDocId()
        streamingDocIdRef.current = id
        setStreamingDoc({
          id,
          title: title || '',
          language: language || 'markdown',
          content: '',
          isStreaming: true,
        })
        setActiveDocId(id)
        setDocPanelOpen(true)
        if (sessionId) markDocVisibleState(sessionId, 'open')
      },
      onDocStreamDelta: ({ content }) => {
        setStreamingDoc((prev) => (prev ? { ...prev, content: content || '' } : null))
      },
      onDocUpdate: ({ doc_id }) => {
        streamingDocIdRef.current = null
        setStreamingDoc(null)
        setActiveDocId(doc_id)
        setDocPanelOpen(true)
        if (sessionId) {
          void queryClient.invalidateQueries({ queryKey: sessionDocumentsKey(sessionId) })
          void queryClient.invalidateQueries({ queryKey: ['documents', doc_id] })
          markDocVisibleState(sessionId, 'open')
        }
      },
      onDocSuggestions: ({ doc_id, suggestions }) => {
        if (doc_id) setActiveDocId(doc_id)
        setDocPanelOpen(true)
        setPendingDocSuggestions(suggestions)
        if (sessionId) markDocVisibleState(sessionId, 'open')
        toast.message(
          `${suggestions.length} document suggestion${suggestions.length === 1 ? '' : 's'} ready`,
        )
      },
    }),
    [queryClient, sessionId],
  )

  const sendOpts = useMemo(
    () => ({
      mode: toggles.mode,
      useWeb: toggles.useWeb,
      allowBash: toggles.allowBash,
      planMode: toggles.planMode,
      useRag,
      incognito,
      activeDocId,
      docPanelOpen,
      presetId: characterPreset.selectedPresetId,
      onDocStream: docStreamCallbacks,
      onUiControl: (event: StreamEvent) => {
        if (event.type !== 'ui_control') return
        handleChatUiControl(event, {
          setToggle: (name, state) => toggles.applyUiControl({ toggle_name: name, state }),
          setMode: toggles.setMode,
          setRag: (state) => {
            dispatchUiControlToggle('rag', state)
            setUseRag(state)
          },
          setIncognito: (state) => {
            dispatchUiControlToggle('incognito', state)
            setIncognito(state)
          },
          applyTheme: theme.applyPreset,
          applyThemeColors: (colors) => theme.updateColors(colors),
          saveCustomTheme: theme.saveCustomTheme,
          updateThemeOptions: theme.updateOptions,
        })
      },
    }),
    [
      toggles,
      useRag,
      incognito,
      activeDocId,
      docPanelOpen,
      characterPreset.selectedPresetId,
      docStreamCallbacks,
      theme,
      setUseRag,
      setIncognito,
    ],
  )

  const toggleDocPanel = useCallback(() => {
    setDocPanelOpen((open) => {
      const next = !open
      if (sessionId) markDocVisibleState(sessionId, next ? 'open' : 'closed')
      return next
    })
  }, [sessionId])

  const handleNewChat = useCallback(() => {
    setIncognito(readIncognitoPref())
    compare.close()
    setCompareMode(false)
    if (!activePending && defaultChat) {
      startNewChat({
        url: defaultChat.endpoint_url,
        modelId: defaultChat.model,
        endpointId: defaultChat.endpoint_id,
      })
    } else if (activePending) {
      startNewChat(activePending)
    } else if (modelOptions[0]) {
      const m = modelOptions[0]
      startNewChat({ url: m.url, modelId: m.id, endpointId: m.endpointId })
    }
  }, [activePending, compare, defaultChat, modelOptions, setIncognito, startNewChat])

  const slashContext: SlashContext = useMemo(
    () => ({
      skills: skillsIndex,
      sessionId,
      sessions,
      archivedSessions,
      currentSession: currentSession ?? null,
      activePending,
      navigate: (path) => navigate(path),
      startNewChat: handleNewChat,
      selectSession,
      deleteSession,
      renameSession: (id, name) => renameSession({ id, name }),
      archiveSession,
      toggleImportant,
      forkSession: async (keepCount) => {
        if (!sessionId) return null
        const newId = await chat.forkFrom(sessionId, Math.max(0, keepCount - 1))
        if (newId) void queryClient.invalidateQueries({ queryKey: ['sessions'] })
        return newId
      },
      truncateSession: async (keepCount) => {
        if (!sessionId) return
        await chat.truncateAndReload(sessionId, keepCount)
      },
      clearMessages: () => chat.clearMessages(),
      invalidateSessions: () => {
        void queryClient.invalidateQueries({ queryKey: ['sessions'] })
        void queryClient.invalidateQueries({ queryKey: ['sessions', 'archived'] })
        void queryClient.invalidateQueries({ queryKey: ['models'] })
      },
      getRag: () => useRag,
      setRag: setUseRag,
      getIncognito: () => incognito,
      setIncognito,
      setWeb: toggles.setUseWeb,
      setBash: toggles.setAllowBash,
      setPlan: toggles.setPlanMode,
      applyTheme: theme.applyPreset,
      saveCustomTheme: theme.saveCustomTheme,
      deleteCustomTheme: theme.deleteCustomTheme,
      getThemeColors: () => theme.settings.colors,
      reloadSession: sessionId
        ? async () => {
            await chat.loadHistory(sessionId, sendOpts)
          }
        : undefined,
    }),
    [
      skillsIndex,
      sessionId,
      sessions,
      archivedSessions,
      currentSession,
      activePending,
      navigate,
      handleNewChat,
      selectSession,
      deleteSession,
      renameSession,
      archiveSession,
      toggleImportant,
      chat,
      queryClient,
      useRag,
      incognito,
      toggles,
      theme,
      sendOpts.onUiControl,
      sendOpts.onDocStream,
    ],
  )

  useEffect(() => {
    if (!sessionId) {
      void chat.stop()
      chat.clearMessages()
      loadedSessionRef.current = null
      setStreamingDoc(null)
      streamingDocIdRef.current = null
      return
    }
    if (loadedSessionRef.current === sessionId) return
    loadedSessionRef.current = sessionId
    void chat.stop()
    void chat.loadHistory(sessionId, sendOpts)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to sessionId changes
  }, [sessionId])

  const handleModelChange = async (model: ModelOption) => {
    if (sessionId) {
      try {
        await updateSessionModel(sessionId, model.id, model.url, model.endpointId)
        void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update model')
      }
    } else {
      startNewChat({ url: model.url, modelId: model.id, endpointId: model.endpointId })
    }
  }

  const handleSend = async (
    message: string,
    options: {
      attachments: string[]
      useRag: boolean
      incognito: boolean
      mode: 'chat' | 'agent'
      useWeb: boolean
      allowBash: boolean
      planMode: boolean
    },
  ) => {
    const slash = await handleSlashCommand(message, slashContext)
    let sendWeb = options.useWeb
    if (slash.handled) {
      if ('prefillComposer' in slash) {
        setComposerPrefill(slash.prefillComposer)
        return
      }
      if ('openWorkspacePicker' in slash) {
        return
      }
      if ('reply' in slash && slash.reply) {
        chat.appendLocalSlashReply(message.trim(), slash.reply, {
          hideUser: slash.hideUserBubble,
          typewriter: slash.typewriter,
        })
        return
      }
      if ('sendToModel' in slash && slash.sendToModel) {
        if (slash.message.startsWith('/')) {
          const composed = await resolveSkillSlashMessage(slash.message)
          if (composed) {
            message = composed
          } else {
            toast.error(`Skill not found: ${slash.message.split(/\s/)[0]}`)
            return
          }
        } else {
          message = slash.message
          if (slash.enableWeb) {
            toggles.setUseWeb(true)
            sendWeb = true
          }
        }
      } else {
        return
      }
    }

    if (compareMode) {
      if (!selectedModel || !compareRightModel) {
        toast.error('Need two models configured for compare')
        return
      }
      if (compare.isStreaming) {
        compare.stop()
        return
      }
      await compare.runPrompt(message, selectedModel, compareRightModel, {
        isBlind: compare.state?.blindMode ?? true,
        followUp: Boolean(compare.state?.voted),
      })
      return
    }

    const wasPending = !sessionId
    void chat
      .sendMessage(message, {
        sessionId,
        pending: activePending,
        attachments: options.attachments,
        materialize: async (pending, matOpts) => {
          const id = await materializePending(pending, matOpts)
          if (matOpts?.incognito) markIncognito(id)
          loadedSessionRef.current = id
          return id
        },
        onUiControl: sendOpts.onUiControl,
        onDocStream: sendOpts.onDocStream,
        activeDocId: sendOpts.activeDocId,
        docPanelOpen: sendOpts.docPanelOpen,
        presetId: sendOpts.presetId,
        useRag: options.useRag,
        incognito: options.incognito,
        mode: options.mode,
        useWeb: sendWeb,
        allowBash: options.allowBash,
        planMode: options.planMode,
      })
      .then((id) => {
        if (wasPending && id) {
          if (options.incognito) markIncognito(id)
          navigate(`/chat/${id}`, { replace: true })
        }
      })
  }

  const handleFork = async (aiIndex: number) => {
    if (!sessionId) return
    const newId = await chat.forkFrom(sessionId, aiIndex)
    if (newId) {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      selectSession(newId)
    }
  }

  const handleApprovePlan = () => {
    if (!sessionId || !chat.pendingPlan) return
    void chat.approvePlan(sessionId, chat.pendingPlan.text, {
      pending: null,
      materialize: async () => sessionId,
      ...sendOpts,
    })
    toggles.setPlanMode(false)
    setPlanWindowOpen(false)
  }

  const handleAskUserSelect = (answer: string) => {
    chat.dismissAskUser()
    void handleSend(answer, {
      attachments: [],
      useRag,
      incognito,
      mode: toggles.mode,
      useWeb: toggles.useWeb,
      allowBash: toggles.allowBash,
      planMode: toggles.planMode,
    })
  }

  const handleApplyDocSuggestion = (suggestion: DocSuggestion) => {
    if (streamingDoc && activeDocId === streamingDoc.id) {
      setStreamingDoc({
        ...streamingDoc,
        content: applyDocSuggestion(streamingDoc.content, suggestion),
      })
    }
    setPendingDocSuggestions((prev) => {
      const next = prev?.filter((s) => s.id !== suggestion.id) ?? null
      return next?.length ? next : null
    })
    toast.success('Suggestion applied')
  }

  useEffect(() => {
    const onNew = () => handleNewChat()
    const onStar = () => {
      if (!sessionId || !currentSession) return
      toggleImportant(sessionId, !currentSession.is_important)
    }
    const onDelete = () => {
      if (!sessionId) return
      const session = sessions.find((s) => s.id === sessionId)
      if (session?.is_important) {
        toast.error('Unstar before deleting')
        return
      }
      if (window.confirm('Delete this session?')) {
        deleteSession(sessionId)
      }
    }
    const onCancel = () => {
      if (compare.isStreaming) compare.stop()
      else if (chat.isStreaming) void chat.stop()
    }
    const onFocus = () => composerFocusRef.current?.()
    const onSearch = () => setSearchOpen(true)
    const onTts = () => {
      void (async () => {
        const available = await ttsManager.checkAvailability()
        if (!available) return
        if (ttsManager.getIsPlaying()) {
          ttsManager.stop()
          return
        }
        const buttons = document.querySelectorAll<HTMLButtonElement>('.ai-tts-button')
        for (let i = buttons.length - 1; i >= 0; i--) {
          const btn = buttons[i]
          if (btn.offsetParent !== null || btn.getClientRects().length > 0) {
            btn.click()
            return
          }
        }
      })()
    }
    const onIncognito = () => setIncognito((v) => !v)

    window.addEventListener(KEYBIND_EVENTS.newSession, onNew)
    window.addEventListener(KEYBIND_EVENTS.starSession, onStar)
    window.addEventListener(KEYBIND_EVENTS.deleteSession, onDelete)
    window.addEventListener(KEYBIND_EVENTS.cancel, onCancel)
    window.addEventListener(KEYBIND_EVENTS.focusInput, onFocus)
    window.addEventListener(KEYBIND_EVENTS.search, onSearch)
    window.addEventListener(KEYBIND_EVENTS.ttsToggle, onTts)
    window.addEventListener(KEYBIND_EVENTS.incognitoToggle, onIncognito)

    return () => {
      window.removeEventListener(KEYBIND_EVENTS.newSession, onNew)
      window.removeEventListener(KEYBIND_EVENTS.starSession, onStar)
      window.removeEventListener(KEYBIND_EVENTS.deleteSession, onDelete)
      window.removeEventListener(KEYBIND_EVENTS.cancel, onCancel)
      window.removeEventListener(KEYBIND_EVENTS.focusInput, onFocus)
      window.removeEventListener(KEYBIND_EVENTS.search, onSearch)
      window.removeEventListener(KEYBIND_EVENTS.ttsToggle, onTts)
      window.removeEventListener(KEYBIND_EVENTS.incognitoToggle, onIncognito)
    }
  }, [
    chat,
    compare,
    currentSession,
    deleteSession,
    handleNewChat,
    sessionId,
    sessions,
    toggleImportant,
  ])

  const showOnboarding = !modelsLoading && (!hasModels || !isConfigured)
  // Existing sessions use sessionId; only unsaved /chat drafts need activePending.
  const chatDisabled = showOnboarding || (!sessionId && !activePending)
  const planText = chat.pendingPlan?.text ?? (sessionId ? getStoredPlan(sessionId) : '')
  const streaming = compareMode ? compare.isStreaming : chat.isStreaming

  return (
    <div className="flex h-full min-h-0">
      <SessionSidebar
        sessions={sessions}
        archivedSessions={archivedSessions}
        currentSessionId={sessionId}
        isPending={Boolean(pendingChat)}
        incognitoIds={incognitoIds}
        onNewChat={handleNewChat}
        onSelect={selectSession}
        onDelete={deleteSession}
        onRename={(id, name) => renameSession({ id, name })}
        onArchive={archiveSession}
        onUnarchive={unarchiveSession}
        onToggleImportant={toggleImportant}
        onMoveToFolder={moveToFolder}
        disabled={showOnboarding}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">
            {pendingChat ? 'New chat' : (currentSession?.name ?? 'Chat')}
            {incognito && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">Incognito</span>
            )}
          </h1>
          <button
            type="button"
            className="hidden rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted sm:inline"
            onClick={() => setSearchOpen(true)}
          >
            Search {keybinds.search.replace('ctrl', '⌃').replace('k', 'K')}
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${
              compareMode
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => {
              if (compareMode) compare.close()
              setCompareMode((v) => !v)
            }}
            aria-pressed={compareMode}
          >
            <GitCompare className="h-3.5 w-3.5" />
            Compare
          </button>
          <CharacterPresetIndicator
            active={characterPreset.active}
            label={characterPreset.label}
            locked={characterPreset.locked}
            onOpen={() => setPresetDialogOpen(true)}
            onDeactivate={() => void characterPreset.deactivate()}
          />
          <DocumentPanelToggle open={docPanelOpen} onToggle={toggleDocPanel} />
          <ModelPicker
            models={modelOptions}
            value={selectedModelId}
            onChange={(m) => void handleModelChange(m)}
            disabled={showOnboarding || streaming}
          />
        </div>

        {compareMode && compare.state ? (
          <CompareInChatPanel
            state={compare.state}
            isStreaming={compare.isStreaming}
            onVote={(w) => void compare.submitVote(w)}
            onClose={() => {
              compare.close()
              setCompareMode(false)
            }}
            onStop={compare.stop}
            onShuffle={compare.shufflePanes}
            onToggleBlind={compare.setBlindMode}
          />
        ) : null}

        {showChatBanner && !showOnboarding ? (
          <div className="mx-4 mt-3 flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <p className="min-w-0 flex-1 leading-relaxed">
              <span className="font-medium text-foreground">Welcome to chat.</span> Type{' '}
              <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">/</kbd>{' '}
              for commands, use the mic for voice input, and toggle the speaker icon for auto
              read-aloud on replies.
            </p>
            <button
              type="button"
              className="shrink-0 rounded px-2 py-0.5 hover:bg-muted"
              onClick={() => {
                markChatFirstVisitSeen()
                setShowChatBanner(false)
              }}
            >
              Got it
            </button>
          </div>
        ) : null}

        {!compareMode ? (
          <MessageList
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            isLoading={sessionsLoading && Boolean(sessionId) && chat.isLoadingHistory}
            sessionId={sessionId}
            streamLive={chat.streamLive}
            pendingPlanSessionId={chat.pendingPlan?.sessionId ?? null}
            ttsAutoPlay={toggles.ttsAutoPlay}
            onEditUser={
              sessionId
                ? (index, text) =>
                    void chat.editUserMessage(sessionId, index, text, {
                      pending: null,
                      materialize: async () => sessionId,
                      ...sendOpts,
                    })
                : undefined
            }
            onDelete={(index) => void chat.deleteMessageAt(sessionId, index)}
            onRegenerate={
              sessionId
                ? (aiIndex) =>
                    void chat.regenerateFrom(sessionId, aiIndex, {
                      pending: null,
                      materialize: async () => sessionId,
                      ...sendOpts,
                    })
                : undefined
            }
            onResend={
              sessionId
                ? (userIndex) =>
                    void chat.resendUserMessage(sessionId, userIndex, {
                      pending: null,
                      materialize: async () => sessionId,
                      ...sendOpts,
                    })
                : undefined
            }
            onFork={sessionId ? (aiIndex) => void handleFork(aiIndex) : undefined}
            onSwitchVariant={
              sessionId
                ? (aiIndex, variantIndex) => void chat.switchVariant(sessionId, aiIndex, variantIndex)
                : undefined
            }
            onApprovePlan={handleApprovePlan}
            onOpenPlanWindow={() => setPlanWindowOpen(true)}
            pendingAskUser={chat.pendingAskUser}
            onAskUserSelect={handleAskUserSelect}
            onAskUserDismiss={chat.dismissAskUser}
            emptyState={
              showOnboarding ? (
                <OnboardingWizard />
              ) : (
                <div className="text-center">
                  <h2 className="text-lg font-semibold">Start a conversation</h2>
                  <p className="mt-2 text-sm text-muted">
                    Send a message to begin. Your chat history will appear here.
                  </p>
                </div>
              )
            }
          />
        ) : compare.state ? null : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
            Compare mode is on. Send a message to stream the same prompt to two models side by side.
          </div>
        )}

        <ChatComposer
          onSend={(msg, opts) => void handleSend(msg, opts)}
          onStop={() => {
            if (compareMode) compare.stop()
            else void chat.stop()
          }}
          isStreaming={streaming}
          disabled={chatDisabled}
          initialValue={composerPrefill}
          focusRef={composerFocusRef}
          useRag={useRag}
          onUseRagChange={setUseRag}
          incognito={incognito}
          onIncognitoChange={setIncognito}
          mode={toggles.mode}
          onModeChange={toggles.setMode}
          useWeb={toggles.useWeb}
          onUseWebChange={toggles.setUseWeb}
          allowBash={toggles.allowBash}
          onAllowBashChange={toggles.setAllowBash}
          planMode={toggles.planMode}
          onPlanModeChange={toggles.setPlanMode}
          ttsAutoPlay={toggles.ttsAutoPlay}
          onTtsAutoPlayChange={toggles.setTtsAutoPlay}
          placeholder={
            compareMode
              ? 'Compare prompt — sent to two models…'
              : showOnboarding
                ? 'Configure a model in Settings first…'
                : 'Message Odysseus… (type / for commands)'
          }
        />
      </div>
      <DocumentPanelDock
        open={docPanelOpen}
        onToggle={toggleDocPanel}
        sessionId={sessionId}
        activeDocId={activeDocId}
        onSelectDoc={setActiveDocId}
        streamingDoc={streamingDoc}
        pendingSuggestions={pendingDocSuggestions}
        onDismissSuggestions={() => setPendingDocSuggestions(null)}
        onApplySuggestion={handleApplyDocSuggestion}
      />
      <CharacterPresetDialog
        open={presetDialogOpen}
        onClose={() => setPresetDialogOpen(false)}
        initial={characterPreset.custom}
        userTemplates={characterPreset.userTemplates}
        onSave={characterPreset.savePreset}
      />
      <SessionSearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectSession={selectSession}
      />
      <PlanWindow
        open={planWindowOpen}
        planMarkdown={planText}
        onClose={() => setPlanWindowOpen(false)}
        onApprove={chat.pendingPlan ? handleApprovePlan : undefined}
      />
    </div>
  )
}
