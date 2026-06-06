import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchUserTemplates } from '@/api/cookbook'
import { fetchPresetsMap, saveCustomPreset } from '@/api/presets'
import {
  findTemplateByName,
  getSelectedPresetId,
  indicatorLabel,
  isPresetActive,
  loadCharSessions,
  presetFromCustom,
  removeCharSession,
  saveCharSession,
  type CustomPresetConfig,
} from '@/lib/characterPresets'

const DEFAULT_CUSTOM: CustomPresetConfig = {
  character_name: '',
  system_prompt: '',
  temperature: 1,
  max_tokens: 0,
  enabled: true,
}

export function useCharacterPreset(sessionId: string | null) {
  const presetsQuery = useQuery({
    queryKey: ['presets', 'map'],
    queryFn: fetchPresetsMap,
    staleTime: 60_000,
  })
  const templatesQuery = useQuery({
    queryKey: ['presets', 'templates'],
    queryFn: fetchUserTemplates,
    staleTime: 60_000,
  })

  const [custom, setCustom] = useState<CustomPresetConfig>(DEFAULT_CUSTOM)
  const [persistentSessionId, setPersistentSessionId] = useState<string | null>(null)

  useEffect(() => {
    const serverCustom = presetsQuery.data?.custom
    if (serverCustom) {
      setCustom((prev) => ({ ...prev, ...presetFromCustom(serverCustom) }))
    }
  }, [presetsQuery.data])

  const userTemplates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])

  const onSessionSwitch = useCallback(
    (nextSessionId: string | null) => {
      if (persistentSessionId && persistentSessionId !== nextSessionId) {
        setCustom((prev) => ({ ...prev, enabled: false }))
        setPersistentSessionId(null)
      }
      if (!nextSessionId) return

      const charSessions = loadCharSessions()
      const charName = charSessions[nextSessionId]
      if (!charName) {
        setPersistentSessionId(null)
        return
      }

      const tmpl = findTemplateByName(charName, userTemplates)
      if (tmpl) {
        setCustom({
          character_name: charName,
          system_prompt: tmpl.prompt,
          temperature: tmpl.temperature ?? 1,
          max_tokens: 0,
          enabled: true,
        })
        setPersistentSessionId(nextSessionId)
      }
    },
    [persistentSessionId, userTemplates],
  )

  useEffect(() => {
    onSessionSwitch(sessionId)
  }, [sessionId, onSessionSwitch])

  const selectedPresetId = useMemo(() => getSelectedPresetId(custom), [custom])
  const active = isPresetActive(custom)
  const locked = persistentSessionId != null && persistentSessionId === sessionId

  const savePreset = useCallback(
    async (next: CustomPresetConfig) => {
      setCustom(next)
      await saveCustomPreset({
        name: next.character_name,
        enabled: next.enabled,
        temperature: next.temperature,
        max_tokens: next.max_tokens,
        system_prompt: next.system_prompt,
        inject_prefix: next.inject_prefix,
        inject_suffix: next.inject_suffix,
      }).catch(() => {})
    },
    [],
  )

  const deactivate = useCallback(async () => {
    if (locked) return
    const next = { ...custom, enabled: false }
    setCustom(next)
    await saveCustomPreset({
      name: next.character_name,
      enabled: false,
      temperature: next.temperature,
      max_tokens: next.max_tokens,
      system_prompt: next.system_prompt,
      inject_prefix: next.inject_prefix,
      inject_suffix: next.inject_suffix,
    }).catch(() => {})
  }, [custom, locked])

  const removePersistentMapping = useCallback((deletedSessionId: string) => {
    removeCharSession(deletedSessionId)
    if (persistentSessionId === deletedSessionId) {
      setPersistentSessionId(null)
      setCustom((prev) => ({ ...prev, enabled: false }))
    }
  }, [persistentSessionId])

  return {
    custom,
    active,
    locked,
    selectedPresetId,
    label: active ? indicatorLabel(custom) : '',
    userTemplates,
    savePreset,
    deactivate,
    removePersistentMapping,
    saveCharSessionMapping: saveCharSession,
  }
}
