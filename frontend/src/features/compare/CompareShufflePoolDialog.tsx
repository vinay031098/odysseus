import { useMemo, useState } from 'react'
import { Dices, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getExcludedModels,
  groupModelsForPool,
  setExcludedModels,
  setModelExcluded,
} from './shufflePool'
import type { ModelOption } from '@/api/types'
import { modelDisplayName } from './compareHelpers'

interface CompareShufflePoolDialogProps {
  open: boolean
  models: ModelOption[]
  onClose: () => void
}

export function CompareShufflePoolDialog({
  open,
  models,
  onClose,
}: CompareShufflePoolDialogProps) {
  const [excluded, setExcluded] = useState<string[]>(() => getExcludedModels())
  const groups = useMemo(() => groupModelsForPool(models), [models])

  if (!open) return null

  function toggle(modelId: string, checked: boolean) {
    setModelExcluded(modelId, checked)
    setExcluded(getExcludedModels())
  }

  function clearAll() {
    setExcludedModels([])
    setExcluded([])
  }

  function renderGroup(title: string, items: ModelOption[]) {
    if (!items.length) return null
    return (
      <div className="mb-3">
        <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <div className="space-y-0.5">
          {items.map((m) => {
            const included = !excluded.includes(m.id)
            const label = m.endpointName
              ? `${modelDisplayName(m)} (${m.endpointName})`
              : modelDisplayName(m)
            return (
              <label
                key={`${m.endpointId}:${m.id}`}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-panel/60"
              >
                <input
                  type="checkbox"
                  checked={included}
                  onChange={(e) => toggle(m.id, e.target.checked)}
                  className="rounded border-border"
                />
                <span className="min-w-0 truncate">{label}</span>
              </label>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      className="modal fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shuffle-pool-title"
    >
      <div className="modal-content max-h-[85vh] w-full max-w-md overflow-hidden rounded-lg border border-border bg-background shadow-xl p-0">
        <div className="modal-header justify-between px-4 py-3">
          <h3 id="shuffle-pool-title" className="flex items-center gap-2 text-sm font-semibold">
            <Dices className="h-4 w-4" aria-hidden />
            Shuffle Pool
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-panel hover:text-foreground"
            aria-label="Close shuffle pool editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          <p className="mb-3 text-xs text-muted-foreground">
            Uncheck models to exclude them from random shuffle. They can still be picked manually.
          </p>
          {renderGroup('Chat models', groups.chat)}
          {renderGroup('Image models', groups.image)}
          {!models.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No models configured.</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" size="sm" variant="ghost" onClick={clearAll}>
            Include all
          </Button>
          <Button type="button" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
