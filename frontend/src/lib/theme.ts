/** Theme presets + CSS application — ported from legacy `static/js/theme.js`. */

export interface ThemeColors {
  bg: string
  fg: string
  panel: string
  border: string
  red: string
  advanced?: Record<string, string>
}

export type BgPattern =
  | 'none'
  | 'dots'
  | 'synapse'
  | 'rain'
  | 'constellations'
  | 'perlin-flow'
  | 'petals'
  | 'sparkles'
  | 'embers'

export type FontChoice = 'mono' | 'sans' | 'serif'

export interface ThemeSettings {
  name: string
  colors: ThemeColors
  font?: FontChoice | string
  density?: 'comfortable' | 'compact' | 'spacious'
  bgPattern?: BgPattern
  bgEffectColor?: string
  bgEffectIntensity?: number
  bgEffectSize?: number
  frosted?: boolean
}

export const THEME_PRESETS: Record<string, ThemeColors> = {
  dark: { bg: '#282c34', fg: '#9cdef2', panel: '#111111', border: '#355a66', red: '#e06c75' },
  light: { bg: '#f0ebe3', fg: '#5a5248', panel: '#faf6f0', border: '#d4cdc2', red: '#c47d5a' },
  midnight: { bg: '#0d1117', fg: '#c9d1d9', panel: '#161b22', border: '#30363d', red: '#f85149' },
  paper: { bg: '#faf8f5', fg: '#3b3836', panel: '#ffffff', border: '#d5d0c8', red: '#c5ac4a' },
  cyberpunk: { bg: '#0a0a0f', fg: '#0ff0fc', panel: '#12101a', border: '#9b30ff', red: '#e040fb' },
  retrowave: { bg: '#1a1a2e', fg: '#e94560', panel: '#16213e', border: '#533483', red: '#e94560' },
  forest: { bg: '#1b2a1b', fg: '#a8d5a2', panel: '#142414', border: '#3d6b3d', red: '#7cb871' },
  ocean: { bg: '#0b1a2c', fg: '#64d2ff', panel: '#091422', border: '#1e5074', red: '#4facfe' },
  ume: { bg: '#2b1b2e', fg: '#f5c2e7', panel: '#1e1420', border: '#6c4675', red: '#f5a0c0' },
  copper: { bg: '#1c1410', fg: '#e8c39e', panel: '#140f0a', border: '#7a5533', red: '#d4764e' },
  terminal: { bg: '#000000', fg: '#00ff41', panel: '#0a0a0a', border: '#003b00', red: '#00ff41' },
  organs: { bg: '#0a0406', fg: '#efe1c8', panel: '#15080a', border: '#3a1519', red: '#c83240' },
  lavender: { bg: '#f3eef8', fg: '#3d3551', panel: '#faf7ff', border: '#cec3de', red: '#9b6dcc' },
  gpt: {
    bg: '#212121',
    fg: '#ececec',
    panel: '#171717',
    border: '#424242',
    red: '#949494',
    advanced: {
      sendBtnBg: '#949494',
      sendBtnHover: '#7f7f7f',
      userBubbleBg: '#2f2f2f',
      aiBubbleBg: '#171717',
      inputBg: '#2f2f2f',
    },
  },
  claude: { bg: '#262624', fg: '#f5f4f0', panel: '#30302e', border: '#4a4a47', red: '#c6613f' },
  cute: { bg: '#fff0f5', fg: '#d4608a', panel: '#fff8fa', border: '#f0c0d0', red: '#ff6b9d' },
}

export const PRESET_LABELS: Record<string, string> = {
  dark: 'Original',
  gpt: 'GPT',
  ume: 'Ume',
}

export const THEME_DEFAULT_PATTERN: Partial<Record<string, BgPattern>> = {
  dark: 'none',
  light: 'dots',
  midnight: 'rain',
  paper: 'dots',
  cyberpunk: 'synapse',
  retrowave: 'embers',
  forest: 'petals',
  ocean: 'constellations',
  terminal: 'perlin-flow',
  organs: 'rain',
  ume: 'petals',
  cute: 'sparkles',
}

export const THEME_DEFAULT_EFFECT_COLOR: Partial<Record<string, string>> = {
  midnight: '#ffffff',
  organs: '#451616',
  cute: '#ff8cb8',
  ume: '#f5a0c0',
}

export const THEME_DEFAULT_INTENSITY: Partial<Record<string, number>> = {
  midnight: 0.5,
  terminal: 0.8,
  organs: 0.65,
}

export const THEME_DEFAULT_FROSTED: Partial<Record<string, boolean>> = {
  lavender: true,
}

export const FONT_MAP: Record<FontChoice, string> = {
  mono: "'Fira Code', ui-monospace, monospace",
  sans: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
}

export const BG_PATTERN_OPTIONS: { value: BgPattern; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'dots', label: 'Dots' },
  { value: 'synapse', label: 'Synapse grid' },
  { value: 'rain', label: 'Rain' },
  { value: 'constellations', label: 'Constellations' },
  { value: 'perlin-flow', label: 'Perlin flow' },
  { value: 'petals', label: 'Petals' },
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'embers', label: 'Embers' },
]

/** Patterns where intensity/size sliders have no visible effect (legacy theme.js). */
export const STATIC_BG_PATTERNS: ReadonlySet<BgPattern> = new Set(['none', 'dots'])

export const CANVAS_BG_PATTERNS: BgPattern[] = [
  'synapse',
  'rain',
  'constellations',
  'perlin-flow',
  'petals',
  'sparkles',
  'embers',
]

export const BG_PATTERN_HINTS: Record<BgPattern, string> = {
  none: 'Solid theme background',
  dots: 'CSS radial dot grid',
  synapse: 'Grid lines with animated light pulses',
  rain: 'Falling rain streaks',
  constellations: 'Drifting stars with connecting lines',
  'perlin-flow': 'Noise-driven particle flow field',
  petals: 'Falling petal shapes',
  sparkles: 'Twinkling four-point stars',
  embers: 'Rising ember particles with glow',
}

export function isCanvasBgPattern(pattern: BgPattern | undefined): boolean {
  return !!pattern && CANVAS_BG_PATTERNS.includes(pattern)
}

export const THEME_STORAGE_KEY = 'odysseus-theme'
export const CUSTOM_THEMES_KEY = 'odysseus-custom-themes'
export const DEFAULT_PRESET = 'dark'
export const MAX_CUSTOM_THEMES = 8

export type HarmonyType = 'monochromatic' | 'complementary' | 'analogous' | 'triadic'

export type AdvancedColorKey =
  | 'userBubbleBg'
  | 'aiBubbleBg'
  | 'bubbleBorder'
  | 'sidebarBg'
  | 'brandColor'
  | 'hamburgerColor'
  | 'inputBg'
  | 'inputBorder'
  | 'sendBtnBg'
  | 'sendBtnHover'
  | 'codeBg'
  | 'codeFg'
  | 'toggleActive'

export const ADVANCED_COLOR_GROUPS: {
  group: string
  fields: { key: AdvancedColorKey; label: string }[]
}[] = [
  {
    group: 'Chat bubbles',
    fields: [
      { key: 'userBubbleBg', label: 'User bubble' },
      { key: 'aiBubbleBg', label: 'AI bubble' },
      { key: 'bubbleBorder', label: 'Bubble border' },
    ],
  },
  {
    group: 'Chat input',
    fields: [
      { key: 'inputBg', label: 'Input background' },
      { key: 'inputBorder', label: 'Input border' },
      { key: 'sendBtnBg', label: 'Send button' },
      { key: 'sendBtnHover', label: 'Send hover' },
    ],
  },
  {
    group: 'Code blocks',
    fields: [
      { key: 'codeBg', label: 'Code background' },
      { key: 'codeFg', label: 'Code text' },
    ],
  },
  {
    group: 'Sidebar & controls',
    fields: [
      { key: 'sidebarBg', label: 'Sidebar background' },
      { key: 'brandColor', label: 'Brand accent' },
      { key: 'hamburgerColor', label: 'Menu icon' },
      { key: 'toggleActive', label: 'Toggle active' },
    ],
  },
]

const ADV_KEYS: { key: AdvancedColorKey; css: string }[] = [
  { key: 'userBubbleBg', css: '--user-bubble-bg' },
  { key: 'aiBubbleBg', css: '--ai-bubble-bg' },
  { key: 'bubbleBorder', css: '--bubble-border' },
  { key: 'sidebarBg', css: '--sidebar-bg' },
  { key: 'brandColor', css: '--brand-color' },
  { key: 'hamburgerColor', css: '--hamburger-color' },
  { key: 'inputBg', css: '--input-bg' },
  { key: 'inputBorder', css: '--input-border' },
  { key: 'sendBtnBg', css: '--send-btn-bg' },
  { key: 'sendBtnHover', css: '--send-btn-hover' },
  { key: 'codeBg', css: '--code-bg' },
  { key: 'codeFg', css: '--code-fg' },
  { key: 'toggleActive', css: '--toggle-active' },
]

export type CustomFontVariant = { file: string; url: string; format: string }
export type CustomFontsMap = Record<string, CustomFontVariant[]>

const injectedFonts = new Set<string>()

const LIGHT_PRESETS = new Set(['light', 'paper', 'lavender', 'cute'])

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '')
  if (h.length !== 6) return null
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function hexToHsl(hex: string): [number, number, number] {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360
  const ss = Math.max(0, Math.min(100, s)) / 100
  const ll = Math.max(0, Math.min(100, l)) / 100
  const a = ss * Math.min(ll, 1 - ll)
  const f = (n: number) => {
    const k = (n + hh / 30) % 12
    return ll - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

export function deriveSyntaxColors(colors: ThemeColors) {
  const [fgH, fgS, fgL] = hexToHsl(colors.fg)
  const [bgH, bgS, bgL] = hexToHsl(colors.bg)
  const [redH, redS] = hexToHsl(colors.red || '#e06c75')
  const isDark = bgL < 50
  const codeBgL = isDark ? Math.max(bgL - 4, 0) : Math.min(bgL + 4, 100)
  return {
    bg: hslToHex(bgH, bgS, codeBgL),
    fg: colors.fg,
    keyword: hslToHex((redH + 280) % 360, Math.min(redS + 10, 80), isDark ? 70 : 45),
    string: hslToHex(40, Math.min(fgS + 20, 70), isDark ? 72 : 42),
    comment: hslToHex(
      fgH,
      Math.max(fgS - 20, 5),
      isDark ? fgL * 0.5 + bgL * 0.5 : fgL * 0.5 + bgL * 0.5,
    ),
    function: hslToHex(210, Math.min(fgS + 20, 75), isDark ? 70 : 45),
    number: hslToHex(20, Math.min(fgS + 15, 65), isDark ? 68 : 48),
    builtin: hslToHex(180, Math.min(fgS + 15, 60), isDark ? 65 : 40),
    variable: hslToHex((fgH + 30) % 360, Math.min(fgS + 5, 60), isDark ? fgL : fgL),
    params: hslToHex(
      fgH,
      Math.max(fgS - 5, 10),
      isDark ? Math.min(fgL + 8, 85) : Math.max(fgL - 8, 25),
    ),
  }
}

export function computeAdvancedDefaults(colors: ThemeColors): Record<AdvancedColorKey, string> {
  const syn = deriveSyntaxColors(colors)
  const red = colors.red || '#e06c75'
  return {
    userBubbleBg: colors.bg,
    aiBubbleBg: colors.panel,
    bubbleBorder: colors.border,
    sidebarBg: colors.panel,
    brandColor: red,
    hamburgerColor: colors.fg,
    inputBg: colors.panel,
    inputBorder: colors.border,
    sendBtnBg: red,
    sendBtnHover: red,
    codeBg: syn.bg,
    codeFg: syn.fg,
    toggleActive: red,
  }
}

export function generateHarmonyColors(
  accentHex: string,
  harmonyType: HarmonyType,
  mode: 'dark' | 'light',
): ThemeColors {
  const [h, s] = hexToHsl(accentHex)
  const isDark = mode === 'dark'

  let bgH: number
  let bgS: number
  let bgL: number
  let fgS: number
  let fgL: number
  let panelL: number
  let borderH: number
  let borderS: number
  let borderL: number

  if (harmonyType === 'complementary') {
    bgH = h
    bgS = Math.max(s * 0.15, 3)
    bgL = isDark ? 13 : 95
    fgL = isDark ? 85 : 15
    fgS = Math.max(s * 0.2, 5)
    panelL = isDark ? 8 : 98
    borderH = h
    borderS = Math.max(s * 0.25, 8)
    borderL = isDark ? 28 : 75
  } else if (harmonyType === 'analogous') {
    bgH = (h - 30 + 360) % 360
    bgS = Math.max(s * 0.12, 3)
    bgL = isDark ? 14 : 95
    fgL = isDark ? 84 : 18
    fgS = Math.max(s * 0.15, 5)
    panelL = isDark ? 9 : 97
    borderH = (h + 30) % 360
    borderS = Math.max(s * 0.3, 10)
    borderL = isDark ? 30 : 72
  } else if (harmonyType === 'triadic') {
    bgH = (h + 240) % 360
    bgS = Math.max(s * 0.1, 2)
    bgL = isDark ? 13 : 96
    fgL = isDark ? 86 : 14
    fgS = Math.max(s * 0.18, 5)
    panelL = isDark ? 8 : 99
    borderH = (h + 120) % 360
    borderS = Math.max(s * 0.2, 8)
    borderL = isDark ? 28 : 74
  } else {
    bgH = h
    bgS = Math.max(s * 0.08, 2)
    bgL = isDark ? 12 : 96
    fgL = isDark ? 87 : 13
    fgS = Math.max(s * 0.15, 5)
    panelL = isDark ? 7 : 99
    borderH = h
    borderS = Math.max(s * 0.2, 6)
    borderL = isDark ? 26 : 76
  }

  return {
    bg: hslToHex(bgH, bgS, bgL),
    fg: hslToHex(h, fgS, fgL),
    panel: hslToHex(bgH, bgS * 0.6, panelL),
    border: hslToHex(borderH, borderS, borderL),
    red: accentHex,
  }
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function validateThemeColors(colors: unknown): colors is ThemeColors {
  if (!colors || typeof colors !== 'object') return false
  const c = colors as Record<string, unknown>
  for (const key of ['bg', 'fg', 'panel', 'border', 'red'] as const) {
    if (typeof c[key] !== 'string' || !HEX_RE.test(c[key] as string)) return false
  }
  return true
}

export function parseThemeImport(raw: string): ThemeSettings {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim())
  } catch {
    throw new Error('Invalid JSON.')
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid theme object.')
  const obj = parsed as Record<string, unknown>
  const colors = (obj.colors ?? obj) as unknown
  if (!validateThemeColors(colors)) throw new Error('Missing or invalid base colors.')
  const settings: ThemeSettings = {
    name: typeof obj.name === 'string' ? obj.name : 'imported',
    colors: {
      bg: colors.bg,
      fg: colors.fg,
      panel: colors.panel,
      border: colors.border,
      red: colors.red,
      advanced:
        colors.advanced && typeof colors.advanced === 'object'
          ? (colors.advanced as Record<string, string>)
          : undefined,
    },
  }
  if (typeof obj.font === 'string') settings.font = obj.font
  if (obj.density === 'comfortable' || obj.density === 'compact' || obj.density === 'spacious') {
    settings.density = obj.density
  }
  if (typeof obj.bgPattern === 'string') settings.bgPattern = obj.bgPattern as BgPattern
  if (typeof obj.bgEffectColor === 'string') settings.bgEffectColor = obj.bgEffectColor
  if (typeof obj.bgEffectIntensity === 'number') settings.bgEffectIntensity = obj.bgEffectIntensity
  if (typeof obj.bgEffectSize === 'number') settings.bgEffectSize = obj.bgEffectSize
  if (typeof obj.frosted === 'boolean') settings.frosted = obj.frosted
  return settings
}

export function exportThemeJson(settings: ThemeSettings): string {
  return JSON.stringify(settings, null, 2)
}

export async function fetchCustomFonts(): Promise<CustomFontsMap> {
  try {
    const res = await fetch('/api/fonts/custom', { credentials: 'same-origin' })
    if (!res.ok) return {}
    const data = (await res.json()) as { fonts?: CustomFontsMap }
    return data.fonts ?? {}
  } catch {
    return {}
  }
}

export function injectCustomFont(familyName: string, variants: CustomFontVariant[]): void {
  if (injectedFonts.has(familyName) || typeof document === 'undefined') return
  const fmtMap: Record<string, string> = {
    woff2: 'woff2',
    woff: 'woff',
    ttf: 'truetype',
    otf: 'opentype',
  }
  const style = document.createElement('style')
  style.dataset.customFont = familyName
  for (const v of variants) {
    style.textContent += `@font-face { font-family: '${familyName}'; src: url('${v.url}') format('${fmtMap[v.format] || v.format}'); font-display: swap; }\n`
  }
  document.head.appendChild(style)
  injectedFonts.add(familyName)
}

function isLightBg(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  const l = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return l > 0.55
}

export function readSavedTheme(): ThemeSettings | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as ThemeSettings
    if (obj.name === 'chatgpt') obj.name = 'gpt'
    if (obj.name === 'sakura') obj.name = 'ume'
    if (!obj?.colors?.bg) return null
    return obj
  } catch {
    return null
  }
}

export function writeSavedTheme(settings: ThemeSettings): void {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings))
}

export function readCustomThemes(): Record<string, ThemeColors & Partial<Omit<ThemeSettings, 'name' | 'colors'>>> {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ThemeColors>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function writeCustomThemes(themes: Record<string, unknown>): void {
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes))
}

export function presetDefaults(name: string): Partial<ThemeSettings> {
  return {
    bgPattern: THEME_DEFAULT_PATTERN[name] ?? 'none',
    bgEffectColor: THEME_DEFAULT_EFFECT_COLOR[name] ?? '',
    bgEffectIntensity: THEME_DEFAULT_INTENSITY[name] ?? 1,
    bgEffectSize: 1,
    frosted: THEME_DEFAULT_FROSTED[name] === true,
    font: 'sans',
    density: 'comfortable',
  }
}

export function buildSettingsFromPreset(name: string): ThemeSettings {
  const colors = THEME_PRESETS[name] ?? THEME_PRESETS[DEFAULT_PRESET]
  const defaults = presetDefaults(name)
  return {
    name,
    colors,
    font: defaults.font,
    density: defaults.density,
    bgPattern: defaults.bgPattern,
    bgEffectColor: defaults.bgEffectColor,
    bgEffectIntensity: defaults.bgEffectIntensity,
    bgEffectSize: defaults.bgEffectSize,
    frosted: defaults.frosted,
  }
}

export function applyThemeColors(colors: ThemeColors, presetName?: string): void {
  const root = document.documentElement
  root.style.setProperty('--color-background', colors.bg)
  root.style.setProperty('--color-foreground', colors.fg)
  root.style.setProperty('--color-panel', colors.panel)
  root.style.setProperty('--color-border', colors.border)
  root.style.setProperty('--color-primary', colors.red)
  root.style.setProperty('--bg', colors.bg)
  root.style.setProperty('--fg', colors.fg)
  root.style.setProperty('--panel', colors.panel)
  root.style.setProperty('--border', colors.border)
  root.style.setProperty('--red', colors.red)

  const light = (presetName && LIGHT_PRESETS.has(presetName)) || isLightBg(colors.bg)
  root.classList.toggle('light', light)

  const syn = deriveSyntaxColors(colors)
  root.style.setProperty('--hl-bg', syn.bg)
  root.style.setProperty('--hl-fg', syn.fg)
  root.style.setProperty('--hl-keyword', syn.keyword)
  root.style.setProperty('--hl-string', syn.string)
  root.style.setProperty('--hl-comment', syn.comment)
  root.style.setProperty('--hl-function', syn.function)
  root.style.setProperty('--hl-number', syn.number)
  root.style.setProperty('--hl-builtin', syn.builtin)
  root.style.setProperty('--hl-variable', syn.variable)
  root.style.setProperty('--hl-params', syn.params)

  const adv = colors.advanced ?? {}
  const defaults = computeAdvancedDefaults(colors)
  for (const { key, css } of ADV_KEYS) {
    root.style.setProperty(css, adv[key] || defaults[key])
  }

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', colors.bg)
}

export function applyFont(
  font: FontChoice | string | undefined,
  customFonts?: CustomFontsMap,
): void {
  const choice = font ?? 'sans'
  let family = FONT_MAP[choice as FontChoice]
  if (!family && customFonts?.[choice]) {
    injectCustomFont(choice, customFonts[choice])
    family = `'${choice}', sans-serif`
  }
  if (!family) family = FONT_MAP.sans
  document.documentElement.style.setProperty('--font-family', family)
  document.body.style.fontFamily = family
}

export function applyFrosted(on: boolean): void {
  document.body.classList.toggle('theme-frosted', !!on)
}

export function applyBgEffectVars(settings: ThemeSettings): void {
  const root = document.documentElement
  root.style.setProperty('--bg-effect-color', settings.bgEffectColor || settings.colors.fg)
  root.style.setProperty(
    '--bg-effect-intensity',
    String(settings.bgEffectIntensity ?? 1),
  )
  root.style.setProperty('--bg-effect-size', String(settings.bgEffectSize ?? 1))
}

const BG_CLASSES = [
  'bg-pattern-dots',
  'bg-pattern-synapse',
  'bg-pattern-rain',
  'bg-pattern-constellations',
  'bg-pattern-perlin-flow',
  'bg-pattern-petals',
  'bg-pattern-sparkles',
  'bg-pattern-embers',
] as const

export function applyBgPatternClass(pattern: BgPattern | undefined): void {
  const p = pattern ?? 'none'
  document.body.classList.remove(...BG_CLASSES)
  if (p !== 'none') document.body.classList.add(`bg-pattern-${p}`)
}

export function applyThemeSettings(
  settings: ThemeSettings,
  customFonts?: CustomFontsMap,
): void {
  applyThemeColors(settings.colors, settings.name)
  applyFont(settings.font, customFonts)
  applyFrosted(!!settings.frosted)
  applyBgEffectVars(settings)
  applyBgPatternClass(settings.bgPattern)
}

export function initThemeFromStorage(): ThemeSettings {
  const saved = readSavedTheme()
  const settings = saved ?? buildSettingsFromPreset(DEFAULT_PRESET)
  applyThemeSettings(settings)
  return settings
}

export async function syncThemeToServer(settings: ThemeSettings): Promise<void> {
  try {
    await fetch('/api/prefs/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ value: settings }),
    })
  } catch {
    /* optional when auth disabled */
  }
}
