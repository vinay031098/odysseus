import { useRef, useState } from 'react'
import { FlaskConical, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  ResearchBatchModePicker,
  ResearchSettingsPanel,
  type ResearchBatchMode,
  type ResearchSettingsValues,
} from '@/features/research/ResearchSettingsPanel'

interface ResearchFormProps {
  query: string
  onQueryChange: (v: string) => void
  settings: ResearchSettingsValues
  onSettingsChange: (patch: Partial<ResearchSettingsValues>) => void
  isStarting: boolean
  queuedCount: number
  onSubmit: () => void
  onQueue: () => void
  onStartAll: (mode: ResearchBatchMode) => void
}

export function ResearchForm({
  query,
  onQueryChange,
  settings,
  onSettingsChange,
  isStarting,
  queuedCount,
  onSubmit,
  onQueue,
  onStartAll,
}: ResearchFormProps) {
  const disabled = isStarting || !query.trim()
  const startBtnRef = useRef<HTMLButtonElement>(null)
  const [batchPickerOpen, setBatchPickerOpen] = useState(false)

  const handlePrimaryClick = () => {
    if (queuedCount > 1) {
      setBatchPickerOpen(true)
      return
    }
    onSubmit()
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-panel/30 p-4">
      <div className="space-y-2">
        <Label htmlFor="research-query">Research topic</Label>
        <textarea
          id="research-query"
          className="min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="What should Odysseus research in depth?"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          disabled={isStarting}
        />
      </div>

      <ResearchSettingsPanel
        values={settings}
        onChange={onSettingsChange}
        disabled={isStarting}
      />

      <div className="flex flex-wrap gap-2">
        <Button ref={startBtnRef} onClick={handlePrimaryClick} disabled={disabled && queuedCount <= 1}>
          <FlaskConical className="mr-2 h-4 w-4" />
          {isStarting
            ? 'Starting…'
            : queuedCount > 1
              ? `Start all (${queuedCount})`
              : 'Start'}
        </Button>
        <Button type="button" variant="outline" onClick={onQueue} disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          Queue
        </Button>
        {queuedCount > 1 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setBatchPickerOpen(true)}
            disabled={isStarting}
          >
            Run queued ({queuedCount})
          </Button>
        ) : null}
      </div>

      <ResearchBatchModePicker
        open={batchPickerOpen}
        anchorRef={startBtnRef}
        count={queuedCount + (query.trim() ? 1 : 0)}
        onPick={(mode) => {
          setBatchPickerOpen(false)
          onStartAll(mode)
        }}
        onClose={() => setBatchPickerOpen(false)}
      />
    </div>
  )
}
