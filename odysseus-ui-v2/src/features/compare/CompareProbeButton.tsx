import { useCallback, useMemo, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { probeSelectedModels } from '@/api/compare'
import { Button } from '@/components/ui/button'
import type { ModelOption } from '@/api/types'
import { isImageModel } from './compareHelpers'

interface CompareProbeButtonProps {
  modelLeft: ModelOption | null
  modelRight: ModelOption | null
  isBlind: boolean
  disabled?: boolean
}

export function CompareProbeButton({
  modelLeft,
  modelRight,
  isBlind,
  disabled,
}: CompareProbeButtonProps) {
  const [probed, setProbed] = useState<Set<string>>(new Set())
  const [probing, setProbing] = useState(false)

  const selected = useMemo(
    () => [modelLeft, modelRight].filter((m): m is ModelOption => m != null),
    [modelLeft, modelRight],
  )

  const hasUnprobed = selected.some((m) => !probed.has(m.id))

  const probeModels = useCallback(async () => {
    const unprobed = selected.filter((m) => !probed.has(m.id))
    if (!unprobed.length) {
      toast.success('All models verified')
      return
    }

    setProbing(true)
    let ok = 0
    let fail = 0
    const nextProbed = new Set(probed)

    try {
      for (const m of unprobed) {
        if (isImageModel(m.id)) {
          nextProbed.add(m.id)
          ok++
          continue
        }

        try {
          const data = await probeSelectedModels([
            {
              endpoint_id: m.endpointId,
              model: m.id,
              endpoint: m.url,
            },
          ])
          const result = data.results?.[0]
          if (result?.status === 'ok') {
            nextProbed.add(m.id)
            ok++
          } else {
            fail++
            const name = isBlind ? 'a model' : m.label
            toast.error(`${name} failed: ${result?.error ?? 'unknown'}`, { duration: 5000 })
          }
        } catch {
          fail++
        }
      }

      setProbed(nextProbed)
      if (fail === 0 && ok > 0) {
        toast.success(`${ok} model${ok > 1 ? 's' : ''} verified`)
      }
    } finally {
      setProbing(false)
    }
  }, [selected, probed, isBlind])

  if (!hasUnprobed || !selected.length) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={probeModels}
      disabled={disabled || probing}
      title="Probe unverified models with a small test request"
    >
      {probing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="mr-2 h-4 w-4" />
      )}
      Probe
    </Button>
  )
}

/** Full-model probe panel (parity with /probe and /test-models slash commands). */
export function CompareProbePanel({ disabled }: { disabled?: boolean }) {
  const [endpointId, setEndpointId] = useState('')
  const [probing, setProbing] = useState(false)

  const runFullProbe = useCallback(async () => {
    setProbing(true)
    try {
      const qs = endpointId.trim() ? `?endpoint_id=${encodeURIComponent(endpointId.trim())}` : ''
      const res = await fetch(`/api/probe${qs}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Probe failed (${res.status})`)
      const reader = res.body?.getReader()
      if (!reader) return
      let ok = 0
      let total = 0
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6)) as { type?: string; status?: string }
            if (data.type === 'probe_result') {
              total++
              if (data.status === 'ok') ok++
            }
          } catch {
            /* ignore malformed SSE */
          }
        }
      }
      toast.success(`Probe complete: ${ok}/${total} models responded`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Probe failed')
    } finally {
      setProbing(false)
    }
  }, [endpointId])

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border border-border/60 bg-panel/20 px-3 py-2">
      <div className="min-w-[140px] flex-1 space-y-1">
        <label htmlFor="probe-endpoint" className="text-xs text-muted-foreground">
          Endpoint ID (optional — /probe)
        </label>
        <input
          id="probe-endpoint"
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
          placeholder="All endpoints if empty"
          value={endpointId}
          onChange={(e) => setEndpointId(e.target.value)}
          disabled={disabled || probing}
        />
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={runFullProbe} disabled={disabled || probing}>
        {probing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Test all models
      </Button>
    </div>
  )
}
