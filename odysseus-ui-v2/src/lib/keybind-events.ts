/** Custom events dispatched by global keybind handler; pages subscribe as needed. */
export const KEYBIND_EVENTS = {
  newSession: 'odysseus:kb-new-session',
  starSession: 'odysseus:kb-star-session',
  deleteSession: 'odysseus:kb-delete-session',
  cancel: 'odysseus:kb-cancel',
  focusInput: 'odysseus:kb-focus-input',
  search: 'odysseus:kb-search',
  toggleChatSidebar: 'odysseus:kb-toggle-chat-sidebar',
  ttsToggle: 'odysseus:kb-tts-toggle',
  incognitoToggle: 'odysseus:kb-incognito-toggle',
} as const

export function dispatchKeybindEvent(name: keyof typeof KEYBIND_EVENTS): void {
  window.dispatchEvent(new CustomEvent(KEYBIND_EVENTS[name]))
}
