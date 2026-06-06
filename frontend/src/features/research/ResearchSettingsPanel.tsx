import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { ChevronDown, Settings2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { useEndpoints } from '@/hooks/useEndpoints'
import { useModels } from '@/hooks/useModels'
import { cn } from '@/lib/utils'
import {
  RESEARCH_CATEGORIES,
  RESEARCH_SEARCH_PROVIDERS,
  RESEARCH_SETTINGS_COLLAPSE_KEY,
  type ResearchBatchMode,
  type ResearchSettingsValues,
} from './researchSettingsHelpers'

export type { ResearchBatchMode, ResearchSettingsValues }

interface ResearchSettingsPanelProps {
  values: ResearchSettingsValues
  onChange: (patch: Partial<ResearchSettingsValues>) => void
  disabled?: boolean
}

export function ResearchSettingsPanel({
  values,
  onChange,
  disabled,
}: ResearchSettingsPanelProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(RESEARCH_SETTINGS_COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const { endpoints } = useEndpoints()
  const { modelOptions } = useModels()

  const endpointModels = useMemo(() => {
    if (!values.endpointId) return modelOptions
    return modelOptions.filter((m) => m.endpointId === values.endpointId)
  }, [modelOptions, values.endpointId])

  useEffect(() => {
    try {
      localStorage.setItem(RESEARCH_SETTINGS_COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Research category">
        {RESEARCH_CATEGORIES.map((cat) => (
          <button
            key={cat.id || 'auto'}
            type="button"
            title={'title' in cat ? cat.title : undefined}
            disabled={disabled}
            onClick={() => onChange({ category: cat.id })}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50',
              values.category === cat.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-panel',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-panel/50 disabled:opacity-50"
      >
        <Settings2 className="h-4 w-4" />
        Settings
        <ChevronDown
          className={cn('ml-auto h-4 w-4 transition-transform', collapsed && '-rotate-90')}
        />
      </button>

      {!collapsed ? (
        <div className="grid gap-3 rounded-md border border-border/60 bg-panel/20 p-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="research-rounds-setting" className="text-xs">
              Max rounds (0 = auto)
            </Label>
            <input
              id="research-rounds-setting"
              type="number"
              min={0}
              max={20}
              disabled={disabled}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={values.maxRounds}
              onChange={(e) => onChange({ maxRounds: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="research-search-provider" className="text-xs">
              Search engine
            </Label>
            <select
              id="research-search-provider"
              disabled={disabled}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={values.searchProvider}
              onChange={(e) => onChange({ searchProvider: e.target.value })}
            >
              {RESEARCH_SEARCH_PROVIDERS.map((p) => (
                <option key={p.id || 'default'} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="research-endpoint" className="text-xs">
              Endpoint
            </Label>
            <select
              id="research-endpoint"
              disabled={disabled}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={values.endpointId}
              onChange={(e) => onChange({ endpointId: e.target.value, model: '' })}
            >
              <option value="">Default</option>
              {endpoints.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="research-model" className="text-xs">
              Model
            </Label>
            <select
              id="research-model"
              disabled={disabled}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={values.model}
              onChange={(e) => onChange({ model: e.target.value })}
            >
              <option value="">Default</option>
              {endpointModels.map((m) => (
                <option key={`${m.endpointId}:${m.id}`} value={m.id}>
                  {m.label ?? m.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </div>
  )
}

interface ResearchBatchModePickerProps {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  count: number
  onPick: (mode: ResearchBatchMode) => void
  onClose: () => void
}

export function ResearchBatchModePicker({
  open,
  anchorRef,
  count,
  onPick,
  onClose,
}: ResearchBatchModePickerProps) {
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })

  useEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const popHeight = 100
    const margin = 6
    const spaceBelow = window.innerHeight - rect.bottom
    const flipUp = spaceBelow < popHeight + margin && rect.top > popHeight + margin
    setPos({
      top: flipUp ? rect.top - popHeight - margin : rect.bottom + margin,
      right: Math.max(8, window.innerWidth - rect.right),
    })
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (popRef.current?.contains(t) || anchorRef.current?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('click', onDoc, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('click', onDoc, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, onClose, anchorRef])

  if (!open) return null

  return (
    <div
      ref={popRef}
      className="fixed z-[10001] min-w-[180px] overflow-hidden rounded-lg border border-border bg-background shadow-xl"
      style={{ top: pos.top, right: pos.right }}
      role="menu"
      aria-label={`Run ${count} queued jobs`}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-panel"
        onClick={() => onPick('parallel')}
      >
        <span className="font-mono text-muted-foreground">≡</span>
        <span>
          <span className="font-medium">Parallel</span>
          <span className="block text-xs text-muted-foreground">All at once</span>
        </span>
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm hover:bg-panel"
        onClick={() => onPick('sequential')}
      >
        <span className="font-mono text-muted-foreground">⋮</span>
        <span>
          <span className="font-medium">Sequential</span>
          <span className="block text-xs text-muted-foreground">One after another</span>
        </span>
      </button>
    </div>
  )
}
