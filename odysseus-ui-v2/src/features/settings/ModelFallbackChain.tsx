import { useCallback, useState } from 'react'
import { GripVertical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { ModelFallbackEntry, ModelEndpoint } from '@/api/types'

const selectClass =
  'flex h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'

interface ModelFallbackChainProps {
  fallbacks: ModelFallbackEntry[]
  endpoints: ModelEndpoint[]
  onChange: (next: ModelFallbackEntry[]) => void
  onSave: (next: ModelFallbackEntry[]) => Promise<void>
  disabled?: boolean
}

export function ModelFallbackChain({
  fallbacks,
  endpoints,
  onChange,
  onSave,
  disabled,
}: ModelFallbackChainProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const enabledEndpoints = endpoints.filter((e) => e.is_enabled)

  const persist = useCallback(
    async (next: ModelFallbackEntry[]) => {
      const clean = next.filter((f) => f.endpoint_id && f.model)
      await onSave(clean)
    },
    [onSave],
  )

  function modelsForEndpoint(epId: string): string[] {
    const ep = endpoints.find((e) => e.id === epId)
    return ep?.models ?? []
  }

  function updateRow(idx: number, patch: Partial<ModelFallbackEntry>) {
    const next = fallbacks.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    onChange(next)
    void persist(next)
  }

  function removeRow(idx: number) {
    const next = fallbacks.filter((_, i) => i !== idx)
    onChange(next)
    void persist(next)
  }

  function addRow() {
    const first = enabledEndpoints[0]
    const next = [...fallbacks, { endpoint_id: first?.id ?? '', model: '' }]
    onChange(next)
    void persist(next)
  }

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= fallbacks.length || to >= fallbacks.length) {
      return
    }
    const next = [...fallbacks]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
    void persist(next)
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div>
        <Label>Fallback models</Label>
        <p className="mt-1 text-xs text-muted">
          Tried in order when the primary default model fails. Drag to reorder.
        </p>
      </div>
      <div className="space-y-2">
        {fallbacks.length === 0 ? (
          <p className="text-sm text-muted">No fallbacks configured.</p>
        ) : (
          fallbacks.map((fb, idx) => (
            <div
              key={`${idx}-${fb.endpoint_id}-${fb.model}`}
              draggable={!disabled}
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (dragIdx !== null) reorder(dragIdx, idx)
                setDragIdx(null)
              }}
              onDragEnd={() => setDragIdx(null)}
              className={`flex items-center gap-2 rounded-md border border-border bg-background/50 p-2 ${
                dragIdx === idx ? 'opacity-60' : ''
              }`}
            >
              <span
                className="cursor-grab text-muted active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <span className="w-5 shrink-0 text-xs text-muted">{idx + 1}.</span>
              <select
                className={selectClass}
                value={fb.endpoint_id}
                disabled={disabled}
                onChange={(e) => {
                  const epId = e.target.value
                  const models = modelsForEndpoint(epId)
                  updateRow(idx, { endpoint_id: epId, model: models[0] ?? '' })
                }}
              >
                {enabledEndpoints.length === 0 ? (
                  <option value="">No endpoints</option>
                ) : (
                  enabledEndpoints.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.name}
                      {!ep.online ? ' (offline)' : ''}
                    </option>
                  ))
                )}
              </select>
              <select
                className={selectClass}
                value={fb.model}
                disabled={disabled || !fb.endpoint_id}
                onChange={(e) => updateRow(idx, { model: e.target.value })}
              >
                {modelsForEndpoint(fb.endpoint_id).length === 0 ? (
                  <option value="">No models</option>
                ) : (
                  modelsForEndpoint(fb.endpoint_id).map((m) => (
                    <option key={m} value={m}>
                      {m.split('/').pop()}
                    </option>
                  ))
                )}
              </select>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="shrink-0"
                disabled={disabled}
                aria-label="Remove fallback"
                onClick={() => removeRow(idx)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
      <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={addRow}>
        Add fallback
      </Button>
    </div>
  )
}
