import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { fetchUserPrefs, setUserPref } from '@/api/settings'
import { applyDensity, getStoredDensity, type DensityMode } from '@/lib/appearance'
import { mountBgEffect } from '@/lib/bgEffects'
import { applyRouteFavicon } from '@/lib/routeMeta'
import {
  applyThemeSettings,
  buildSettingsFromPreset,
  computeAdvancedDefaults,
  exportThemeJson,
  fetchCustomFonts,
  generateHarmonyColors,
  initThemeFromStorage,
  MAX_CUSTOM_THEMES,
  parseThemeImport,
  presetDefaults,
  readCustomThemes,
  readSavedTheme,
  syncThemeToServer,
  THEME_PRESETS,
  writeCustomThemes,
  writeSavedTheme,
  type AdvancedColorKey,
  type BgPattern,
  type FontChoice,
  type HarmonyType,
  type ThemeColors,
  type ThemeSettings,
} from '@/lib/theme'

export type { ThemeSettings, ThemeColors, BgPattern, FontChoice, HarmonyType, AdvancedColorKey }

export function useTheme() {
  const { pathname } = useLocation()
  const [settings, setSettingsState] = useState<ThemeSettings>(() => initThemeFromStorage())

  const customFontsQuery = useQuery({
    queryKey: ['fonts', 'custom'],
    queryFn: fetchCustomFonts,
    staleTime: 5 * 60_000,
    retry: false,
  })

  const customFonts = useMemo(
    () => customFontsQuery.data ?? {},
    [customFontsQuery.data],
  )

  const prefsQuery = useQuery({
    queryKey: ['prefs', 'theme-full'],
    queryFn: async () => {
      const prefs = await fetchUserPrefs()
      return prefs.theme as ThemeSettings | string | undefined
    },
    staleTime: 60_000,
    retry: false,
  })

  useEffect(() => {
    const data = prefsQuery.data
    if (!data || typeof data === 'string') return
    if (typeof data === 'object' && data.colors?.bg) {
      setSettingsState(data)
      applyThemeSettings(data, customFonts)
      writeSavedTheme(data)
    }
  }, [prefsQuery.data, customFonts])

  useEffect(() => {
    applyThemeSettings(settings, customFonts)
    writeSavedTheme(settings)
    if (settings.density) applyDensity(settings.density)
    applyRouteFavicon(pathname, settings.colors.red || '#e06c75')
  }, [settings, customFonts, pathname])

  useEffect(() => {
    return mountBgEffect(settings.bgPattern)
  }, [settings.bgPattern])

  const persist = useCallback((next: ThemeSettings) => {
    setSettingsState(next)
    void syncThemeToServer(next)
    void setUserPref('theme', next).catch(() => {})
  }, [])

  const applyPreset = useCallback(
    (name: string) => {
      const custom = readCustomThemes()
      if (custom[name]) {
        const defaults = presetDefaults(name)
        const next: ThemeSettings = {
          name,
          colors: {
            bg: custom[name].bg,
            fg: custom[name].fg,
            panel: custom[name].panel,
            border: custom[name].border,
            red: custom[name].red,
            advanced: custom[name].advanced,
          },
          font: (custom[name].font as FontChoice) ?? defaults.font,
          density: (custom[name].density as ThemeSettings['density']) ?? defaults.density,
          bgPattern: (custom[name].bgPattern as BgPattern) ?? defaults.bgPattern,
          bgEffectColor: custom[name].bgEffectColor ?? defaults.bgEffectColor,
          bgEffectIntensity: custom[name].bgEffectIntensity ?? defaults.bgEffectIntensity,
          bgEffectSize: custom[name].bgEffectSize ?? defaults.bgEffectSize,
          frosted: custom[name].frosted ?? defaults.frosted,
        }
        persist(next)
        return
      }
      persist(buildSettingsFromPreset(name))
    },
    [persist],
  )

  const updateColors = useCallback(
    (colors: ThemeColors) => {
      persist({
        ...settings,
        name: settings.name === 'custom' ? 'custom' : settings.name,
        colors,
      })
    },
    [persist, settings],
  )

  const updateAdvancedColor = useCallback(
    (key: AdvancedColorKey, value: string) => {
      const defaults = computeAdvancedDefaults(settings.colors)
      const current = settings.colors.advanced ?? {}
      const nextAdvanced = { ...current, [key]: value }
      if (value.toLowerCase() === defaults[key].toLowerCase()) {
        delete nextAdvanced[key]
      }
      const advanced =
        Object.keys(nextAdvanced).length > 0 ? nextAdvanced : undefined
      updateColors({ ...settings.colors, advanced })
    },
    [settings.colors, updateColors],
  )

  const clearAdvancedColors = useCallback(() => {
    updateColors({
      bg: settings.colors.bg,
      fg: settings.colors.fg,
      panel: settings.colors.panel,
      border: settings.colors.border,
      red: settings.colors.red,
    })
  }, [settings.colors, updateColors])

  const getAdvancedColor = useCallback(
    (key: AdvancedColorKey): string => {
      const defaults = computeAdvancedDefaults(settings.colors)
      return settings.colors.advanced?.[key] ?? defaults[key]
    },
    [settings.colors],
  )

  const updateOptions = useCallback(
    (patch: Partial<Omit<ThemeSettings, 'name' | 'colors'>>) => {
      persist({ ...settings, ...patch })
    },
    [persist, settings],
  )

  const applyHarmony = useCallback(
    (accent: string, harmonyType: HarmonyType, mode: 'dark' | 'light') => {
      const colors = generateHarmonyColors(accent, harmonyType, mode)
      persist({ ...settings, name: 'custom', colors })
    },
    [persist, settings],
  )

  const exportTheme = useCallback(() => {
    const json = exportThemeJson(settings)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `odysseus_${settings.name || 'theme'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [settings])

  const importTheme = useCallback(
    (raw: string) => {
      const imported = parseThemeImport(raw)
      const slug =
        imported.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') ||
        'imported'
      const custom = readCustomThemes()
      custom[slug] = {
        ...imported.colors,
        font: imported.font,
        density: imported.density,
        bgPattern: imported.bgPattern,
        bgEffectColor: imported.bgEffectColor,
        bgEffectIntensity: imported.bgEffectIntensity,
        bgEffectSize: imported.bgEffectSize,
        frosted: imported.frosted,
      }
      writeCustomThemes(custom)
      persist({ ...imported, name: slug })
      return slug
    },
    [persist],
  )

  const saveCustomTheme = useCallback(
    (slug: string, colors: ThemeColors): 'ok' | 'limit' => {
      const custom = readCustomThemes()
      if (!custom[slug] && Object.keys(custom).length >= MAX_CUSTOM_THEMES) {
        return 'limit'
      }
      custom[slug] = {
        ...colors,
        font: settings.font,
        density: settings.density,
        bgPattern: settings.bgPattern,
        bgEffectColor: settings.bgEffectColor,
        bgEffectIntensity: settings.bgEffectIntensity,
        bgEffectSize: settings.bgEffectSize,
        frosted: settings.frosted,
      }
      writeCustomThemes(custom)
      persist({ ...settings, name: slug, colors })
      return 'ok'
    },
    [persist, settings],
  )

  const deleteCustomTheme = useCallback(
    (slug: string) => {
      const custom = readCustomThemes()
      delete custom[slug]
      writeCustomThemes(custom)
      if (settings.name === slug) applyPreset('dark')
    },
    [applyPreset, settings.name],
  )

  const resetTheme = useCallback(() => {
    persist(buildSettingsFromPreset('dark'))
  }, [persist])

  const toggleLightDark = useCallback(() => {
    const saved = readSavedTheme()
    const isLight = saved?.name === 'light' || saved?.name === 'paper'
    applyPreset(isLight ? 'dark' : 'light')
  }, [applyPreset])

  const theme =
    settings.name === 'light' ||
    settings.name === 'paper' ||
    settings.name === 'lavender' ||
    settings.name === 'cute'
      ? 'light'
      : 'dark'

  return {
    settings,
    theme,
    presets: THEME_PRESETS,
    customFonts,
    applyPreset,
    updateColors,
    updateAdvancedColor,
    clearAdvancedColors,
    getAdvancedColor,
    updateOptions,
    applyHarmony,
    exportTheme,
    importTheme,
    saveCustomTheme,
    deleteCustomTheme,
    resetTheme,
    setTheme: toggleLightDark,
    toggle: toggleLightDark,
  }
}

export function useDensity() {
  const [density, setDensityState] = useState<DensityMode>(() => getStoredDensity())

  useEffect(() => {
    applyDensity(density)
  }, [density])

  const setDensity = (mode: DensityMode) => {
    setDensityState(mode)
    applyDensity(mode)
    const saved = readSavedTheme()
    if (saved) {
      const next = { ...saved, density: mode }
      writeSavedTheme(next)
      void syncThemeToServer(next)
    }
  }

  return { density, setDensity }
}
