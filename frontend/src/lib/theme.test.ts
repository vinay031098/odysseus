import { describe, expect, it } from 'vitest'
import {
  buildSettingsFromPreset,
  computeAdvancedDefaults,
  exportThemeJson,
  generateHarmonyColors,
  parseThemeImport,
  presetDefaults,
  THEME_PRESETS,
  applyThemeColors,
} from './theme'

describe('theme', () => {
  it('has at least 15 presets', () => {
    expect(Object.keys(THEME_PRESETS).length).toBeGreaterThanOrEqual(15)
  })

  it('builds settings with pattern defaults', () => {
    const s = buildSettingsFromPreset('midnight')
    expect(s.bgPattern).toBe('rain')
    expect(s.bgEffectIntensity).toBe(0.5)
  })

  it('presetDefaults includes frosted for lavender', () => {
    expect(presetDefaults('lavender').frosted).toBe(true)
  })

  it('applyThemeColors sets css variables', () => {
    const colors = THEME_PRESETS.dark
    applyThemeColors(colors, 'dark')
    const bg = document.documentElement.style.getPropertyValue('--color-background')
    expect(bg).toBe(colors.bg)
  })

  it('computeAdvancedDefaults derives send and bubble colors', () => {
    const defaults = computeAdvancedDefaults(THEME_PRESETS.dark)
    expect(defaults.sendBtnBg).toBe(THEME_PRESETS.dark.red)
    expect(defaults.userBubbleBg).toBe(THEME_PRESETS.dark.bg)
    expect(defaults.codeBg).toMatch(/^#/)
  })

  it('generateHarmonyColors returns valid palette', () => {
    const colors = generateHarmonyColors('#e06c75', 'complementary', 'dark')
    expect(colors.red).toBe('#e06c75')
    expect(colors.bg).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('export and parse theme round-trip', () => {
    const settings = buildSettingsFromPreset('ocean')
    const json = exportThemeJson(settings)
    const parsed = parseThemeImport(json)
    expect(parsed.name).toBe('ocean')
    expect(parsed.colors.bg).toBe(THEME_PRESETS.ocean.bg)
  })

  it('parseThemeImport rejects invalid json', () => {
    expect(() => parseThemeImport('{bad')).toThrow(/invalid json/i)
  })
})
