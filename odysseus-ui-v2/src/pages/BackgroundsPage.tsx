import { useEffect, useRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { mountBgPreview } from '@/lib/bgEffects'
import {
  BG_PATTERN_HINTS,
  BG_PATTERN_OPTIONS,
  PRESET_LABELS,
  STATIC_BG_PATTERNS,
  THEME_DEFAULT_PATTERN,
  THEME_PRESETS,
  isCanvasBgPattern,
  presetDefaults,
  type BgPattern,
} from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function PatternPreviewTile({
  pattern,
  active,
  bgColor,
  effectColor,
  intensity,
  onSelect,
}: {
  pattern: BgPattern
  active: boolean
  bgColor: string
  effectColor: string
  intensity: number
  onSelect: () => void
}) {
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const label = BG_PATTERN_OPTIONS.find((o) => o.value === pattern)?.label ?? pattern

  useEffect(() => {
    const host = canvasHostRef.current
    if (!host || !isCanvasBgPattern(pattern)) return
    return mountBgPreview(host, pattern, bgColor)
  }, [pattern, bgColor, effectColor, intensity])

  const tileStyle = {
    '--tile-bg': bgColor,
    '--tile-effect-color': effectColor,
    '--tile-intensity': String(intensity),
  } as CSSProperties

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'bg-pattern-card group text-left transition ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        active && 'bg-pattern-card-active',
      )}
      aria-pressed={active}
      aria-label={`${label} background${active ? ', selected' : ''}`}
    >
      <div
        className={cn(
          'bg-preview-tile',
          pattern === 'dots' && 'bg-preview-tile--dots',
          pattern === 'synapse' && 'bg-preview-tile--synapse',
        )}
        style={tileStyle}
      >
        {pattern === 'none' ? (
          <div className="bg-preview-solid" style={{ backgroundColor: bgColor }} />
        ) : null}
        {isCanvasBgPattern(pattern) ? (
          <div ref={canvasHostRef} className="bg-preview-canvas-host" />
        ) : null}
      </div>
      <div className="bg-pattern-card-meta">
        <span className="font-medium">{label}</span>
        <span className="text-muted">{BG_PATTERN_HINTS[pattern]}</span>
      </div>
    </button>
  )
}

/** Full-page sandbox for background patterns (legacy `/backgrounds`). */
export function BackgroundsPage() {
  const { settings, applyPreset, updateOptions } = useTheme()
  const currentPattern = settings.bgPattern ?? 'none'
  const effectColor = settings.bgEffectColor || settings.colors.fg
  const intensity = settings.bgEffectIntensity ?? 1
  const size = settings.bgEffectSize ?? 1
  const showEffectSliders = !STATIC_BG_PATTERNS.has(currentPattern)
  const presetDefault = presetDefaults(settings.name)

  const applyThemeDefaults = () => {
    updateOptions({
      bgPattern: presetDefault.bgPattern,
      bgEffectColor: presetDefault.bgEffectColor,
      bgEffectIntensity: presetDefault.bgEffectIntensity,
      bgEffectSize: presetDefault.bgEffectSize,
      frosted: presetDefault.frosted,
    })
  }

  const resetEffectColor = () => {
    updateOptions({ bgEffectColor: '' })
  }

  return (
    <div className="backgrounds-page h-full overflow-y-auto">
      <div className="backgrounds-page-inner mx-auto max-w-4xl space-y-6 p-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Background effects lab</h1>
          <p className="text-sm text-muted">
            Prototype animated backgrounds on the live page. Settings sync with{' '}
            <Link to="/settings" className="text-primary underline-offset-2 hover:underline">
              Settings → Appearance
            </Link>
            .
          </p>
        </div>

        <div className="rounded-lg border border-border bg-panel/80 p-4 space-y-4 backdrop-blur-sm">
          <h2 className="text-sm font-medium">Base theme</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1">
              <Label htmlFor="bg-theme" className="text-xs text-muted">
                Preset
              </Label>
              <select
                id="bg-theme"
                value={settings.name}
                onChange={(e) => applyPreset(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                {Object.keys(THEME_PRESETS).map((name) => (
                  <option key={name} value={name}>
                    {PRESET_LABELS[name] ?? name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={applyThemeDefaults}>
              Apply preset defaults
            </Button>
          </div>
          <p className="text-xs text-muted">
            Default for <strong className="font-medium text-foreground">{settings.name}</strong>:{' '}
            {BG_PATTERN_OPTIONS.find((o) => o.value === (THEME_DEFAULT_PATTERN[settings.name] ?? 'none'))
              ?.label ?? 'None'}
            {presetDefault.frosted ? ' · frosted glass' : ''}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Pattern previews</h2>
            <span className="text-xs text-muted">
              Active:{' '}
              {BG_PATTERN_OPTIONS.find((o) => o.value === currentPattern)?.label ?? currentPattern}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BG_PATTERN_OPTIONS.map((o) => (
              <PatternPreviewTile
                key={o.value}
                pattern={o.value}
                active={currentPattern === o.value}
                bgColor={settings.colors.bg}
                effectColor={effectColor}
                intensity={intensity}
                onSelect={() => updateOptions({ bgPattern: o.value })}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-panel/80 p-4 space-y-4 backdrop-blur-sm">
          <h2 className="text-sm font-medium">Effect controls</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="bg-pattern-select" className="text-xs text-muted">
                Pattern
              </Label>
              <select
                id="bg-pattern-select"
                value={currentPattern}
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

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="effect-color" className="text-xs text-muted">
                Effect color
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="effect-color"
                  type="color"
                  value={effectColor}
                  onChange={(e) => updateOptions({ bgEffectColor: e.target.value })}
                  className="h-9 w-14 cursor-pointer rounded border border-border bg-transparent"
                  title="Effect color"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetEffectColor}
                  title="Reset to text color"
                  aria-label="Reset effect color to text color"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {showEffectSliders ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="effect-intensity" className="text-xs text-muted">
                  Intensity ({Math.round(intensity * 100)}%)
                </Label>
                <input
                  id="effect-intensity"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(intensity * 100)}
                  onChange={(e) =>
                    updateOptions({ bgEffectIntensity: parseInt(e.target.value, 10) / 100 })
                  }
                  className="mt-2 w-full"
                />
              </div>
              <div>
                <Label htmlFor="effect-size" className="text-xs text-muted">
                  Size ({Math.round(size * 100)}%)
                </Label>
                <input
                  id="effect-size"
                  type="range"
                  min={30}
                  max={250}
                  step={10}
                  value={Math.round(size * 100)}
                  onChange={(e) =>
                    updateOptions({ bgEffectSize: parseInt(e.target.value, 10) / 100 })
                  }
                  className="mt-2 w-full"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">
              Intensity and size apply to animated canvas effects only (not solid or dot patterns).
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-panel/80 p-4 backdrop-blur-sm">
          <h2 className="text-sm font-medium">Sample frosted panel</h2>
          <p className="mt-2 text-sm text-muted">
            Toggle frosted glass above to blur panels like this one over the live background. Canvas
            effects render behind all UI at full viewport size.
          </p>
        </div>
      </div>
    </div>
  )
}
