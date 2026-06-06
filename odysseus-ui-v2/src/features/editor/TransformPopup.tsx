import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { TransformPending } from '@/lib/editor/transformSession'

type TransformPopupProps = {
  pending: TransformPending
  origW: number
  origH: number
  aspectLock: boolean
  onPendingChange: (next: TransformPending) => void
  onAspectLockChange: (locked: boolean) => void
  onApply: () => void
  onCancel: () => void
}

export function TransformPopup({
  pending,
  origW,
  origH,
  aspectLock,
  onPendingChange,
  onAspectLockChange,
  onApply,
  onCancel,
}: TransformPopupProps) {
  const [driver, setDriver] = useState<'w' | 'h' | null>(null)

  useEffect(() => {
    if (!aspectLock) setDriver(null)
  }, [aspectLock])

  const setField = (patch: Partial<TransformPending>) => {
    onPendingChange({ ...pending, ...patch })
  }

  const handleW = (raw: string) => {
    let w = parseInt(raw, 10)
    const flipH = w < 0
    w = Math.abs(w || origW)
    let h = pending.h
    if (aspectLock && origW > 0) {
      setDriver('w')
      const sign = pending.flipV ? -1 : 1
      h = Math.round((w / origW) * origH) * sign
    }
    setField({ w, h: Math.abs(h), flipH })
  }

  const handleH = (raw: string) => {
    let h = parseInt(raw, 10)
    const flipV = h < 0
    h = Math.abs(h || origH)
    let w = pending.w
    if (aspectLock && origH > 0) {
      setDriver('h')
      const sign = pending.flipH ? -1 : 1
      w = Math.round((h / origH) * origW) * sign
    }
    setField({ h, w: Math.abs(w), flipV })
  }

  return (
    <div className="border-b border-border bg-panel px-3 py-2 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium uppercase tracking-wide text-muted">Transform</span>
        <button
          type="button"
          className={`rounded px-1.5 py-0.5 text-[10px] ${aspectLock ? 'bg-primary/20 text-primary' : 'text-muted'}`}
          onClick={() => onAspectLockChange(!aspectLock)}
          title="Lock aspect ratio"
        >
          Aspect
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5">
          W
          <input
            type="number"
            className="rounded border border-border bg-background px-1.5 py-1"
            value={pending.flipH ? -pending.w : pending.w}
            readOnly={aspectLock && driver === 'h'}
            onChange={(e) => handleW(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          H
          <input
            type="number"
            className="rounded border border-border bg-background px-1.5 py-1"
            value={pending.flipV ? -pending.h : pending.h}
            readOnly={aspectLock && driver === 'w'}
            onChange={(e) => handleH(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          Rot °
          <input
            type="number"
            className="rounded border border-border bg-background px-1.5 py-1"
            value={pending.rot}
            onChange={(e) => setField({ rot: parseInt(e.target.value, 10) || 0 })}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          Skew X
          <input
            type="number"
            className="rounded border border-border bg-background px-1.5 py-1"
            value={pending.skewX}
            step={1}
            onChange={(e) => setField({ skewX: parseInt(e.target.value, 10) || 0 })}
          />
        </label>
        <label className="col-span-2 flex flex-col gap-0.5">
          Skew Y
          <input
            type="number"
            className="rounded border border-border bg-background px-1.5 py-1"
            value={pending.skewY}
            step={1}
            onChange={(e) => setField({ skewY: parseInt(e.target.value, 10) || 0 })}
          />
        </label>
      </div>
      <div className="mt-2 flex gap-1">
        <Button size="sm" variant="outline" className="h-7 flex-1 text-[10px]" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" className="h-7 flex-1 text-[10px]" onClick={onApply}>
          Apply
        </Button>
      </div>
    </div>
  )
}
