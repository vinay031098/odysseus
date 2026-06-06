import { useCallback, useEffect, useState } from 'react'
import {
  getBashEnabled,
  getChatMode,
  getWebEnabled,
  isPlanEnabled,
  loadChatToggles,
  saveChatToggles,
  setBashEnabled,
  setChatMode,
  setPlanEnabled,
  setWebEnabled,
  setTtsAutoPlay,
  isTtsAutoPlayEnabled,
  type ChatMode,
  type ChatToggleState,
} from '@/lib/chatToggles'

export function useChatToggles() {
  const [state, setState] = useState<ChatToggleState>(() => loadChatToggles())

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'odysseus-toggles') setState(loadChatToggles())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const mode = getChatMode(state)
  const useWeb = getWebEnabled(mode, state)
  const allowBash = getBashEnabled(mode, state)
  const planMode = isPlanEnabled(state)
  const ttsAutoPlay = isTtsAutoPlayEnabled(state)

  const patch = useCallback((next: Partial<ChatToggleState>) => {
    const merged = { ...loadChatToggles(), ...next }
    saveChatToggles(merged)
    setState(merged)
  }, [])

  const setMode = useCallback((m: ChatMode) => {
    setChatMode(m)
    setState(loadChatToggles())
  }, [])

  const setUseWeb = useCallback(
    (value: boolean) => {
      setWebEnabled(mode, value)
      setState(loadChatToggles())
    },
    [mode],
  )

  const setAllowBash = useCallback(
    (value: boolean) => {
      setBashEnabled(mode, value)
      setState(loadChatToggles())
    },
    [mode],
  )

  const setPlanMode = useCallback((value: boolean) => {
    setPlanEnabled(value)
    setState(loadChatToggles())
  }, [])

  const setTtsAutoPlayMode = useCallback((value: boolean) => {
    setTtsAutoPlay(value)
    setState(loadChatToggles())
  }, [])

  const applyUiControl = useCallback((event: { toggle_name?: string; state?: boolean; mode?: string }) => {
    if (event.mode === 'agent' || event.mode === 'chat') {
      setMode(event.mode)
      return
    }
    if (!event.toggle_name) return
    const current = loadChatToggles()
    const m = getChatMode(current)
    if (event.toggle_name === 'web') setWebEnabled(m, Boolean(event.state))
    else if (event.toggle_name === 'bash') setBashEnabled(m, Boolean(event.state))
    else patch({ [event.toggle_name]: Boolean(event.state) })
    setState(loadChatToggles())
  }, [patch, setMode])

  return {
    mode,
    useWeb,
    allowBash,
    planMode,
    ttsAutoPlay,
    setMode,
    setUseWeb,
    setAllowBash,
    setPlanMode,
    setTtsAutoPlay: setTtsAutoPlayMode,
    applyUiControl,
  }
}
