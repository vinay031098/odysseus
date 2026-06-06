import { STORAGE_KEYS } from '@/lib/storageKeys'

/** Light preset theme names stored in /api/prefs/theme (legacy). */
const LIGHT_THEME_PRESETS = new Set(['light', 'paper'])

export type DensityMode = 'comfortable' | 'compact' | 'spacious'

export function getStoredDensity(): DensityMode {
  const d =
    localStorage.getItem(STORAGE_KEYS.DENSITY) ||
    localStorage.getItem(STORAGE_KEYS.DENSITY_V2_FALLBACK)
  if (d === 'compact' || d === 'spacious') return d
  return 'comfortable'
}

export function applyDensity(density: DensityMode): void {
  document.documentElement.dataset.density = density
  localStorage.setItem(STORAGE_KEYS.DENSITY, density)
  localStorage.removeItem(STORAGE_KEYS.DENSITY_V2_FALLBACK)
}

export function initAppearanceFromStorage(): void {
  applyDensity(getStoredDensity())
}

/** Map a legacy prefs theme name (or full settings object) to v2 light/dark. */
export function prefsThemeToMode(theme: unknown): 'light' | 'dark' | null {
  if (theme && typeof theme === 'object' && 'name' in theme) {
    const name = String((theme as { name: string }).name).toLowerCase()
    if (LIGHT_THEME_PRESETS.has(name)) return 'light'
    return 'dark'
  }
  if (typeof theme !== 'string' || !theme.trim()) return null
  const name = theme.trim().toLowerCase()
  if (name === 'dark') return 'dark'
  if (LIGHT_THEME_PRESETS.has(name)) return 'light'
  return 'dark'
}
