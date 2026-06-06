import { useMemo, useRef, useState } from 'react'
import { ChevronDown, Download, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDensity, useTheme, type HarmonyType } from '@/hooks/useTheme'
import { useUiVisibility } from '@/hooks/useUiVisibility'
import {
  ADVANCED_COLOR_GROUPS,
  BG_PATTERN_OPTIONS,
  FONT_MAP,
  MAX_CUSTOM_THEMES,
  PRESET_LABELS,
  generateHarmonyColors,
  type AdvancedColorKey,
  type BgPattern,
  type FontChoice,
  type ThemeColors,
} from '@/lib/theme'
import {
  isNavVisible,
  NAV_VISIBILITY_KEYS,
  NAV_VISIBILITY_LABELS,
} from '@/lib/ui-visibility'
import { cn } from '@/lib/utils'

const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'bg', label: 'Background' },
  { key: 'fg', label: 'Text' },
  { key: 'panel', label: 'Panel' },
  { key: 'border', label: 'Border' },
  { key: 'red', label: 'Accent' },
]

const HARMONY_TYPES: { value: HarmonyType; label: string }[] = [
  { value: 'monochromatic', label: 'Monochromatic' },
  { value: 'complementary', label: 'Complementary' },
  { value: 'analogous', label: 'Analogous' },
  { value: 'triadic', label: 'Triadic' },
]

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm">{label}</Label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-14 cursor-pointer rounded border border-border bg-transparent"
        aria-label={`${label} color`}
      />
    </div>
  )
}

export function AppearanceTab() {
  const {
    settings,
    presets,
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
  } = useTheme()
  const { density, setDensity } = useDensity()
  const { state, setVisible, reset } = useUiVisibility()
  const [saveName, setSaveName] = useState('')
  const [saveError, setSaveError] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [harmonyAccent, setHarmonyAccent] = useState(settings.colors.red)
  const [harmonyType, setHarmonyType] = useState<HarmonyType>('monochromatic')
  const [harmonyMode, setHarmonyMode] = useState<'dark' | 'light'>('dark')
  const [exportFlash, setExportFlash] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  function readCustomThemes(): Record<string, ThemeColors> {
    try {
      const raw = localStorage.getItem('odysseus-custom-themes')
      return raw ? (JSON.parse(raw) as Record<string, ThemeColors>) : {}
    } catch {
      return {}
    }
  }

  const [customThemes, setCustomThemes] = useState(readCustomThemes)
  const refreshCustomThemes = () => setCustomThemes(readCustomThemes())

  const fontOptions = useMemo(() => {
    const builtIn = Object.keys(FONT_MAP) as FontChoice[]
    const custom = Object.keys(customFonts)
    return { builtIn, custom }
  }, [customFonts])

  const harmonyPreview = useMemo(
    () => generateHarmonyColors(harmonyAccent, harmonyType, harmonyMode),
    [harmonyAccent, harmonyType, harmonyMode],
  )

  const onColorChange = (key: keyof ThemeColors, value: string) => {
    updateColors({ ...settings.colors, [key]: value })
  }

  const onSaveCustom = () => {
    setSaveError('')
    const name = saveName.trim()
    if (!name) {
      setSaveError('Enter a name.')
      return
    }
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!slug) {
      setSaveError('Invalid name.')
      return
    }
    if (presets[slug]) {
      setSaveError('Cannot overwrite a built-in theme.')
      return
    }
    const result = saveCustomTheme(slug, settings.colors)
    if (result === 'limit') {
      setSaveError(`Max ${MAX_CUSTOM_THEMES} custom themes. Delete one first.`)
      return
    }
    refreshCustomThemes()
    setSaveName('')
  }

  const onExport = () => {
    exportTheme()
    setExportFlash(true)
    window.setTimeout(() => setExportFlash(false), 1500)
  }

  const onImport = () => {
    setImportError('')
    try {
      importTheme(importText)
      refreshCustomThemes()
      setImportText('')
      setImportOpen(false)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.')
    }
  }

  const onImportFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImportText(String(reader.result ?? ''))
      setImportOpen(true)
    }
    reader.readAsText(file)
  }

  const staticPatterns = new Set<BgPattern>(['none', 'dots'])

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-panel p-4">
        <h3 className="text-sm font-medium">Theme presets</h3>
        <p className="mt-1 text-xs text-muted">
          {Object.keys(presets).length} built-in presets. Click to apply; customize below.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {Object.entries(presets).map(([name, c]) => (
            <button
              key={name}
              type="button"
              onClick={() => applyPreset(name)}
              className={cn(
                'theme-swatch rounded-md border p-2 text-left text-xs transition-colors',
                settings.name === name
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-border hover:border-muted',
              )}
            >
              <div className="mb-1.5 flex gap-0.5">
                {[c.bg, c.panel, c.fg, c.red].map((color, i) => (
                  <span
                    key={i}
                    className="h-4 flex-1 rounded-sm"
                    style={{ background: color }}
                  />
                ))}
              </div>
              {PRESET_LABELS[name] ?? name}
            </button>
          ))}
        </div>
        {Object.keys(customThemes).length > 0 ? (
          <div className="mt-4">
            <h4 className="text-xs font-medium text-muted mb-2">Your themes</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(customThemes).map(([name]) => (
                <div key={name} className="relative">
                  <button
                    type="button"
                    onClick={() => applyPreset(name)}
                    className={cn(
                      'theme-swatch rounded-md border px-3 py-2 text-xs',
                      settings.name === name ? 'border-primary' : 'border-border',
                    )}
                  >
                    {name}
                  </button>
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 rounded-full bg-panel p-0.5 text-muted hover:text-destructive"
                    aria-label={`Delete theme ${name}`}
                    onClick={() => {
                      deleteCustomTheme(name)
                      refreshCustomThemes()
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-border bg-panel p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium">Customize colors</h3>
          <p className="mt-1 text-xs text-muted">Changes apply live and sync when signed in.</p>
        </div>
        <div className="space-y-2">
          {COLOR_FIELDS.map(({ key, label }) => (
            <ColorRow
              key={key}
              label={label}
              value={settings.colors[key] as string}
              onChange={(v) => onColorChange(key, v)}
            />
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm font-medium"
            onClick={() => setAdvancedOpen((o) => !o)}
            aria-expanded={advancedOpen}
          >
            Advanced overrides
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-180')}
            />
          </button>
          {advancedOpen ? (
            <div className="mt-4 space-y-4">
              {ADVANCED_COLOR_GROUPS.map(({ group, fields }) => (
                <div key={group}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {group}
                  </p>
                  <div className="space-y-2">
                    {fields.map(({ key, label }) => (
                      <ColorRow
                        key={key}
                        label={label}
                        value={getAdvancedColor(key as AdvancedColorKey)}
                        onChange={(v) => updateAdvancedColor(key as AdvancedColorKey, v)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <Button type="button" size="sm" variant="ghost" onClick={clearAdvancedColors}>
                Reset advanced overrides
              </Button>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <h4 className="text-sm font-medium">Color harmony generator</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="harmony-accent" className="text-xs text-muted">
                Accent
              </Label>
              <input
                id="harmony-accent"
                type="color"
                value={harmonyAccent}
                onChange={(e) => setHarmonyAccent(e.target.value)}
                className="mt-1 h-9 w-full cursor-pointer rounded border border-border"
              />
            </div>
            <div>
              <Label htmlFor="harmony-type" className="text-xs text-muted">
                Harmony
              </Label>
              <select
                id="harmony-type"
                value={harmonyType}
                onChange={(e) => setHarmonyType(e.target.value as HarmonyType)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                {HARMONY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="harmony-mode" className="text-xs text-muted">
                Mode
              </Label>
              <select
                id="harmony-mode"
                value={harmonyMode}
                onChange={(e) => setHarmonyMode(e.target.value as 'dark' | 'light')}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-0.5 rounded-md border border-border p-1">
              {[harmonyPreview.bg, harmonyPreview.panel, harmonyPreview.fg, harmonyPreview.border, harmonyPreview.red].map(
                (c, i) => (
                  <span key={i} className="h-6 w-8 rounded-sm" style={{ background: c }} />
                ),
              )}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => applyHarmony(harmonyAccent, harmonyType, harmonyMode)}
            >
              Generate palette
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Input
            placeholder="Save as custom theme…"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            className="max-w-xs"
          />
          <Button type="button" size="sm" onClick={onSaveCustom}>
            Save theme
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={resetTheme}>
            Reset to default
          </Button>
        </div>
        {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button type="button" size="sm" variant="secondary" onClick={onExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {exportFlash ? 'Downloaded!' : 'Export JSON'}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setImportOpen((o) => !o)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import JSON
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => onImportFile(e.target.files?.[0])}
          />
          <Button type="button" size="sm" variant="ghost" onClick={() => importInputRef.current?.click()}>
            Import file…
          </Button>
        </div>
        {importOpen ? (
          <div className="space-y-2">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              placeholder="Paste theme JSON…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={onImport}>
                Apply import
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setImportOpen(false)
                  setImportText('')
                  setImportError('')
                }}
              >
                Cancel
              </Button>
            </div>
            {importError ? <p className="text-xs text-destructive">{importError}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-border bg-panel p-4 space-y-4">
        <h3 className="text-sm font-medium">Background & glass</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="bg-pattern" className="text-xs text-muted">
              Pattern
            </Label>
            <select
              id="bg-pattern"
              value={settings.bgPattern ?? 'none'}
              onChange={(e) => updateOptions({ bgPattern: e.target.value as BgPattern })}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              {BG_PATTERN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              id="frosted-toggle"
              type="checkbox"
              checked={!!settings.frosted}
              onChange={(e) => updateOptions({ frosted: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <Label htmlFor="frosted-toggle">Frosted glass panels</Label>
          </div>
        </div>
        {!staticPatterns.has(settings.bgPattern ?? 'none') ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="effect-color" className="text-xs text-muted">
                Effect color
              </Label>
              <input
                id="effect-color"
                type="color"
                value={settings.bgEffectColor || settings.colors.fg}
                onChange={(e) => updateOptions({ bgEffectColor: e.target.value })}
                className="mt-1 h-8 w-full cursor-pointer rounded border border-border"
              />
            </div>
            <div>
              <Label htmlFor="effect-intensity" className="text-xs text-muted">
                Intensity ({Math.round((settings.bgEffectIntensity ?? 1) * 100)}%)
              </Label>
              <input
                id="effect-intensity"
                type="range"
                min={0}
                max={100}
                value={Math.round((settings.bgEffectIntensity ?? 1) * 100)}
                onChange={(e) =>
                  updateOptions({ bgEffectIntensity: parseInt(e.target.value, 10) / 100 })
                }
                className="mt-2 w-full"
              />
            </div>
            <div>
              <Label htmlFor="effect-size" className="text-xs text-muted">
                Size ({Math.round((settings.bgEffectSize ?? 1) * 100)}%)
              </Label>
              <input
                id="effect-size"
                type="range"
                min={30}
                max={250}
                value={Math.round((settings.bgEffectSize ?? 1) * 100)}
                onChange={(e) =>
                  updateOptions({ bgEffectSize: parseInt(e.target.value, 10) / 100 })
                }
                className="mt-2 w-full"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-border bg-panel p-4">
        <h3 className="text-sm font-medium">Font family</h3>
        <p className="mt-1 text-xs text-muted">
          Custom fonts are loaded from <code className="text-[11px]">static/fonts/custom/</code> when
          available.
        </p>
        <select
          value={settings.font ?? 'sans'}
          onChange={(e) => updateOptions({ font: e.target.value })}
          className="mt-2 w-full max-w-xs rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          style={{
            fontFamily:
              FONT_MAP[(settings.font as FontChoice) ?? 'sans'] ??
              `'${settings.font}', sans-serif`,
          }}
        >
          {fontOptions.builtIn.map((f) => (
            <option key={f} value={f} style={{ fontFamily: FONT_MAP[f] }}>
              {f === 'mono' ? 'Monospace' : f === 'serif' ? 'Serif' : 'Sans-serif'}
            </option>
          ))}
          {fontOptions.custom.length > 0 ? (
            <optgroup label="Custom fonts">
              {fontOptions.custom.map((f) => (
                <option key={f} value={f} style={{ fontFamily: `'${f}', sans-serif` }}>
                  {f}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-panel p-4">
        <h3 className="text-sm font-medium">Density</h3>
        <p className="mt-1 text-xs text-muted">UI spacing preference (stored locally).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['comfortable', 'compact', 'spacious'] as const).map((d) => (
            <Button
              key={d}
              type="button"
              variant={density === d ? 'default' : 'secondary'}
              onClick={() => {
                setDensity(d)
                updateOptions({ density: d })
              }}
            >
              {d}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">Sidebar navigation</h3>
            <p className="mt-1 text-xs text-muted">
              Show or hide main nav items. Drag section headers in the sidebar to reorder.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Reset
          </Button>
        </div>
        <ul className="mt-4 space-y-2">
          {NAV_VISIBILITY_LABELS.map(({ path, label }) => {
            const key = NAV_VISIBILITY_KEYS[path]
            const visible = isNavVisible(path, state)
            return (
              <li key={path} className="flex items-center justify-between gap-3 text-sm">
                <Label htmlFor={`nav-vis-${key}`}>{label}</Label>
                <input
                  id={`nav-vis-${key}`}
                  type="checkbox"
                  checked={visible}
                  onChange={(e) => setVisible(key, e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
