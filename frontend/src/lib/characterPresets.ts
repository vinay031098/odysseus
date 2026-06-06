/** Character preset persistence — mirrors legacy `static/js/presets.js`. */

import type { CookbookRecipe, PromptPreset, UserTemplate } from '@/api/types'
import { BUILTIN_RECIPES } from '@/api/cookbook'

export const CHAR_SESSIONS_KEY = 'odysseus-char-sessions'

export interface CustomPresetConfig {
  character_name: string
  system_prompt: string
  temperature: number
  max_tokens: number
  enabled: boolean
  inject_prefix?: string
  inject_suffix?: string
}

export function loadCharSessions(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CHAR_SESSIONS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {}
  } catch {
    return {}
  }
}

export function saveCharSession(sessionId: string, characterName: string): void {
  const map = loadCharSessions()
  map[sessionId] = characterName
  localStorage.setItem(CHAR_SESSIONS_KEY, JSON.stringify(map))
}

export function removeCharSession(sessionId: string): void {
  const map = loadCharSessions()
  if (!map[sessionId]) return
  delete map[sessionId]
  localStorage.setItem(CHAR_SESSIONS_KEY, JSON.stringify(map))
}

export function findTemplateByName(
  name: string,
  userTemplates: UserTemplate[],
): CookbookRecipe | undefined {
  const user = userTemplates.find((t) => t.name === name)
  if (user) {
    return {
      id: user.id,
      name: user.name,
      prompt: user.system_prompt,
      temperature: user.temperature,
      source: 'template',
    }
  }
  return BUILTIN_RECIPES.find((r) => r.name === name)
}

export function presetFromCustom(serverCustom: PromptPreset | undefined): CustomPresetConfig {
  return {
    character_name: serverCustom?.name ?? '',
    system_prompt: serverCustom?.system_prompt ?? '',
    temperature: serverCustom?.temperature ?? 1,
    max_tokens: serverCustom?.max_tokens ?? 0,
    enabled: serverCustom?.enabled !== false,
    inject_prefix: serverCustom?.inject_prefix,
    inject_suffix: serverCustom?.inject_suffix,
  }
}

export function isPresetActive(custom: CustomPresetConfig): boolean {
  if (custom.enabled === false) return false
  const hasTuning = custom.temperature !== 1 || (custom.max_tokens ?? 0) !== 0
  const hasInject = Boolean(custom.inject_prefix || custom.inject_suffix)
  const hasChar = Boolean(custom.character_name)
  return hasChar || hasTuning || hasInject || Boolean(custom.system_prompt?.trim())
}

export function getSelectedPresetId(custom: CustomPresetConfig): string | null {
  return isPresetActive(custom) ? 'custom' : null
}

export function indicatorLabel(custom: CustomPresetConfig): string {
  if (custom.character_name) return custom.character_name
  return 'Prompt'
}
