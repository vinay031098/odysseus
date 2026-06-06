import { describe, expect, it, beforeEach } from 'vitest'
import {
  getBashEnabled,
  getChatMode,
  getWebEnabled,
  loadChatToggles,
  saveChatToggles,
  setBashEnabled,
  setChatMode,
  setWebEnabled,
} from '@/lib/chatToggles'

describe('chatToggles', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to chat mode', () => {
    expect(getChatMode()).toBe('chat')
  })

  it('persists per-mode web toggles', () => {
    setWebEnabled('chat', true)
    setWebEnabled('agent', false)
    expect(getWebEnabled('chat')).toBe(true)
    expect(getWebEnabled('agent')).toBe(false)
    expect(loadChatToggles().web_chat).toBe(true)
  })

  it('persists bash per mode', () => {
    setBashEnabled('agent', true)
    expect(getBashEnabled('agent')).toBe(true)
    expect(getBashEnabled('chat')).toBe(false)
  })

  it('saves mode changes', () => {
    setChatMode('agent')
    expect(getChatMode()).toBe('agent')
    saveChatToggles({ ...loadChatToggles(), mode: 'chat' })
    expect(getChatMode()).toBe('chat')
  })
})
