import { Trash2 } from 'lucide-react'
import type { AdjLayer, AdjLayerType } from '@/lib/editor/adjLayers'
import { ADJ_LAYER_LABELS } from '@/lib/editor/adjLayers'
import { Button } from '@/components/ui/button'

type AdjLayersPanelProps = {
  adjLayers: AdjLayer[]
  onAdd: (type: AdjLayerType) => void
  onUpdate: (id: string, patch: Partial<AdjLayer>) => void
  onRemove: (id: string) => void
}

export function AdjLayersPanel({ adjLayers, onAdd, onUpdate, onRemove }: AdjLayersPanelProps) {
  return (
    <div className="space-y-2 border-t border-border pt-2">
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs font-medium text-muted">Adj layers</p>
        <select
          className="h-7 max-w-[130px] rounded border border-border bg-panel px-1 text-[10px]"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as AdjLayerType
            if (v) {
              onAdd(v)
              e.target.value = ''
            }
          }}
          aria-label="Add adjustment layer"
        >
          <option value="">+ Add…</option>
          {(Object.keys(ADJ_LAYER_LABELS) as AdjLayerType[]).map((t) => (
            <option key={t} value={t}>
              {ADJ_LAYER_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      {adjLayers.length === 0 ? (
        <p className="text-[10px] text-muted">Non-destructive stack on active layer.</p>
      ) : (
        <ul className="space-y-2">
          {adjLayers.map((adj) => (
            <li key={adj.id} className="rounded border border-border p-2 text-[10px]">
              <div className="mb-1 flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={adj.visible}
                  onChange={(e) => onUpdate(adj.id, { visible: e.target.checked })}
                  aria-label={`Toggle ${adj.name}`}
                />
                <span className="min-w-0 flex-1 truncate font-medium">{adj.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label={`Remove ${adj.name}`}
                  onClick={() => onRemove(adj.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <label className="flex items-center gap-2 text-muted">
                Opacity
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={adj.opacity}
                  onChange={(e) => onUpdate(adj.id, { opacity: Number(e.target.value) })}
                  className="flex-1"
                />
              </label>
              {adj.type === 'levels' ? (
                <>
                  <label className="mt-1 block text-muted">
                    In black
                    <input
                      type="range"
                      min={0}
                      max={254}
                      value={(adj.params as { inBlack: number }).inBlack}
                      onChange={(e) =>
                        onUpdate(adj.id, {
                          params: {
                            ...(adj.params as import('@/features/editor/pixelAdjustments').LevelsParams),
                            inBlack: Number(e.target.value),
                          },
                        })
                      }
                      className="mt-0.5 w-full"
                    />
                  </label>
                  <label className="block text-muted">
                    Gamma
                    <input
                      type="range"
                      min={10}
                      max={300}
                      value={Math.round((adj.params as { gamma: number }).gamma * 100)}
                      onChange={(e) =>
                        onUpdate(adj.id, {
                          params: {
                            ...(adj.params as import('@/features/editor/pixelAdjustments').LevelsParams),
                            gamma: Number(e.target.value) / 100,
                          },
                        })
                      }
                      className="mt-0.5 w-full"
                    />
                  </label>
                </>
              ) : null}
              {adj.type === 'color-balance' ? (
                <label className="mt-1 block text-muted">
                  Midtones R
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={(adj.params as { midtones: { r: number } }).midtones.r}
                    onChange={(e) =>
                      onUpdate(adj.id, {
                        params: {
                          ...(adj.params as import('@/features/editor/pixelAdjustments').ColorBalanceParams),
                          midtones: {
                            ...(adj.params as import('@/features/editor/pixelAdjustments').ColorBalanceParams)
                              .midtones,
                            r: Number(e.target.value),
                          },
                        },
                      })
                    }
                    className="mt-0.5 w-full"
                  />
                </label>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
