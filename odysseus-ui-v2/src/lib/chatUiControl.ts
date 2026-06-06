import type { StreamUiControlEvent } from '@/api/types'
import type { ThemeColors } from '@/lib/theme'
import { THEME_PRESETS, readCustomThemes } from '@/lib/theme'

export interface ChatUiControlDeps {
  setToggle: (name: string, state: boolean) => void
  setMode: (mode: 'chat' | 'agent') => void
  setRag: (enabled: boolean) => void
  setIncognito: (enabled: boolean) => void
  setModelDisplay?: (model: string) => void
  applyTheme: (name: string) => void
  applyThemeColors: (colors: ThemeColors, name?: string) => void
  saveCustomTheme: (slug: string, colors: ThemeColors) => void
  updateThemeOptions: (patch: Record<string, unknown>) => void
}

export function handleChatUiControl(event: StreamUiControlEvent, deps: ChatUiControlDeps): void {
  const uiEvent = event.ui_event || 'toggle'

  try {
    if (uiEvent === 'toggle') {
      const name = event.toggle_name
      if (!name) return
      if (name === 'rag') deps.setRag(Boolean(event.state))
      else if (name === 'incognito') deps.setIncognito(Boolean(event.state))
      else deps.setToggle(name, Boolean(event.state))
      return
    }

    if (uiEvent === 'set_mode') {
      if (event.mode === 'agent' || event.mode === 'chat') deps.setMode(event.mode)
      return
    }

    if (uiEvent === 'switch_model') {
      if (event.model) deps.setModelDisplay?.(event.model)
      return
    }

    if (uiEvent === 'set_theme') {
      let themeName = event.theme_name
      if (!themeName && !event.colors) return
      if (themeName === 'chatgpt') themeName = 'gpt'
      const customThemes = readCustomThemes()
      const colors =
        (themeName && THEME_PRESETS[themeName]) ||
        (themeName && customThemes[themeName]) ||
        (event.colors as ThemeColors | undefined)
      if (!colors) return
      if (themeName && (THEME_PRESETS[themeName] || customThemes[themeName])) {
        deps.applyTheme(themeName)
      } else {
        deps.applyThemeColors(colors, themeName || 'custom')
      }
      return
    }

    if (uiEvent === 'create_theme') {
      const colors = event.colors as ThemeColors | undefined
      const name = event.theme_name || 'custom'
      if (!colors) return
      deps.applyThemeColors(colors, name)
      const bg = event.bg
      const opts: Record<string, unknown> = {}
      if (bg?.pattern) opts.bgPattern = bg.pattern
      if (bg?.effectColor) opts.bgEffectColor = bg.effectColor
      if (bg?.effectIntensity != null) opts.bgEffectIntensity = bg.effectIntensity
      if (bg?.effectSize != null) opts.bgEffectSize = bg.effectSize
      if (bg?.frosted != null) opts.frosted = bg.frosted
      if (Object.keys(opts).length) deps.updateThemeOptions(opts)
      deps.saveCustomTheme(name, colors)
      return
    }

    if (uiEvent === 'highlight') {
      document.querySelectorAll('.odysseus-highlight').forEach((el) => {
        el.classList.remove('odysseus-highlight')
      })
      document.querySelectorAll('.odysseus-hl-label').forEach((el) => {
        el.remove()
      })
      if (!event.selector) return
      const target = document.querySelector(event.selector)
      if (!target || !(target instanceof HTMLElement)) return
      target.classList.add('odysseus-highlight')
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      if (event.label) {
        const lbl = document.createElement('div')
        lbl.className = 'odysseus-hl-label'
        lbl.textContent = event.label
        if (!target.style.position) target.style.position = 'relative'
        target.appendChild(lbl)
      }
      return
    }

    if (uiEvent === 'clear_highlight') {
      document.querySelectorAll('.odysseus-highlight').forEach((el) => {
        el.classList.remove('odysseus-highlight')
      })
      document.querySelectorAll('.odysseus-hl-label').forEach((el) => {
        el.remove()
      })
    }
  } catch {
    /* best effort — mirrors legacy chatStream.js */
  }
}

export function normalizeUiControlEvent(raw: ChatStreamPayloadLike): StreamUiControlEvent {
  const data =
    raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : raw
  return {
    type: 'ui_control',
    ui_event: (data.ui_event as string) || (raw.ui_event as string) || 'toggle',
    toggle_name: data.toggle_name as string | undefined,
    state: data.state as boolean | undefined,
    mode: data.mode as string | undefined,
    model: data.model as string | undefined,
    theme_name: data.theme_name as string | undefined,
    colors: data.colors as Record<string, string> | undefined,
    selector: data.selector as string | undefined,
    label: data.label as string | undefined,
    bg: data.bg as StreamUiControlEvent['bg'],
  }
}

interface ChatStreamPayloadLike {
  type?: string
  ui_event?: string
  data?: unknown
  toggle_name?: string
  state?: boolean
  mode?: string
  model?: string
  theme_name?: string
  colors?: Record<string, string>
  selector?: string
  label?: string
  bg?: StreamUiControlEvent['bg']
}
