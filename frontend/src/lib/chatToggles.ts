/** Chat tool toggles persisted in localStorage — mirrors legacy `odysseus-toggles`. */

export type ChatMode = 'chat' | 'agent'

export interface ChatToggleState {
  mode?: ChatMode
  web_chat?: boolean
  web_agent?: boolean
  bash_chat?: boolean
  bash_agent?: boolean
  plan?: boolean
  research?: boolean
  [key: string]: boolean | ChatMode | undefined
}

const STORAGE_KEY = 'odysseus-toggles'

const DEFAULTS: ChatToggleState = {
  mode: 'chat',
  web_chat: false,
  web_agent: false,
  bash_chat: false,
  bash_agent: false,
  plan: false,
  research: false,
}

export function loadChatToggles(): ChatToggleState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...(JSON.parse(raw) as ChatToggleState) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveChatToggles(state: ChatToggleState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function patch(next: Partial<ChatToggleState>): ChatToggleState {
  const merged = { ...loadChatToggles(), ...next }
  saveChatToggles(merged)
  return merged
}

export function getChatMode(state?: ChatToggleState): ChatMode {
  const s = state ?? loadChatToggles()
  return s.mode === 'agent' ? 'agent' : 'chat'
}

export function setChatMode(mode: ChatMode): void {
  patch({ mode })
}

function webKey(mode: ChatMode): 'web_chat' | 'web_agent' {
  return mode === 'agent' ? 'web_agent' : 'web_chat'
}

function bashKey(mode: ChatMode): 'bash_chat' | 'bash_agent' {
  return mode === 'agent' ? 'bash_agent' : 'bash_chat'
}

export function getWebEnabled(mode: ChatMode, state?: ChatToggleState): boolean {
  const s = state ?? loadChatToggles()
  return Boolean(s[webKey(mode)])
}

export function setWebEnabled(mode: ChatMode, value: boolean): void {
  patch({ [webKey(mode)]: value })
}

export function getBashEnabled(mode: ChatMode, state?: ChatToggleState): boolean {
  const s = state ?? loadChatToggles()
  return Boolean(s[bashKey(mode)])
}

export function setBashEnabled(mode: ChatMode, value: boolean): void {
  patch({ [bashKey(mode)]: value })
}

export function isPlanEnabled(state?: ChatToggleState): boolean {
  const s = state ?? loadChatToggles()
  return Boolean(s.plan)
}

export function setPlanEnabled(value: boolean): void {
  patch({ plan: value })
}

export function isResearchEnabled(state?: ChatToggleState): boolean {
  return Boolean((state ?? loadChatToggles()).research)
}

export function setResearchEnabled(value: boolean): void {
  patch({ research: value })
}

export function isTtsAutoPlayEnabled(state?: ChatToggleState): boolean {
  return Boolean((state ?? loadChatToggles()).ttsMode)
}

export function setTtsAutoPlay(value: boolean): void {
  patch({ ttsMode: value })
}

/** Toggle web/bash/plan for the current chat mode (used by slash commands). */
export function toggleNamedFeature(
  name: 'web' | 'bash' | 'plan' | 'research',
  value?: boolean,
): boolean {
  const mode = getChatMode()
  const state = loadChatToggles()
  let next: boolean
  if (name === 'web') {
    next = value ?? !getWebEnabled(mode, state)
    setWebEnabled(mode, next)
    return next
  }
  if (name === 'bash') {
    next = value ?? !getBashEnabled(mode, state)
    setBashEnabled(mode, next)
    return next
  }
  if (name === 'plan') {
    next = value ?? !isPlanEnabled(state)
    setPlanEnabled(next)
    if (next) setChatMode('agent')
    return next
  }
  next = value ?? !isResearchEnabled(state)
  setResearchEnabled(next)
  return next
}

export function formatToggleStatus(
  getRag: () => boolean,
  getIncognito: () => boolean,
): string {
  const mode = getChatMode()
  const names = ['web', 'bash', 'rag', 'incognito', 'research', 'plan'] as const
  const lines = names.map((k) => {
    let on = false
    if (k === 'web') on = getWebEnabled(mode)
    else if (k === 'bash') on = getBashEnabled(mode)
    else if (k === 'rag') on = getRag()
    else if (k === 'incognito') on = getIncognito()
    else if (k === 'research') on = isResearchEnabled()
    else if (k === 'plan') on = isPlanEnabled()
    return `  ${k}: ${on ? 'on' : 'off'}`
  })
  return `Toggles:\n${lines.join('\n')}\n\nUsage: /toggle <name> [on|off]`
}
