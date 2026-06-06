import type { ReactNode } from 'react'
import { GitCompare } from 'lucide-react'
import { ModelPicker } from '@/components/chat/ModelPicker'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { ModelOption } from '@/api/types'

interface CompareFormProps {
  models: ModelOption[]
  modelLeftId: string | null
  modelRightId: string | null
  onModelLeftChange: (m: ModelOption) => void
  onModelRightChange: (m: ModelOption) => void
  prompt: string
  onPromptChange: (v: string) => void
  isBlind: boolean
  onBlindChange: (v: boolean) => void
  isRunning: boolean
  onRun: () => void
  onStop: () => void
  disabled?: boolean
  toolbar?: ReactNode
}

export function CompareForm({
  models,
  modelLeftId,
  modelRightId,
  onModelLeftChange,
  onModelRightChange,
  prompt,
  onPromptChange,
  isBlind,
  onBlindChange,
  isRunning,
  onRun,
  onStop,
  disabled,
  toolbar,
}: CompareFormProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-panel/30 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Model A</Label>
          <ModelPicker
            models={models}
            value={modelLeftId}
            onChange={onModelLeftChange}
            disabled={disabled || isRunning}
          />
        </div>
        <div className="space-y-2">
          <Label>Model B</Label>
          <ModelPicker
            models={models}
            value={modelRightId}
            onChange={onModelRightChange}
            disabled={disabled || isRunning}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="compare-prompt">Prompt</Label>
        <textarea
          id="compare-prompt"
          className="min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Enter the same prompt for both models…"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          disabled={disabled || isRunning}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={isBlind}
          onChange={(e) => onBlindChange(e.target.checked)}
          disabled={disabled || isRunning}
          className="rounded border-border"
        />
        Blind comparison (hide model names until you vote)
      </label>

      <div className="flex flex-wrap items-center gap-2">
        {isRunning ? (
          <Button variant="outline" onClick={onStop}>
            Stop
          </Button>
        ) : (
          <Button onClick={onRun} disabled={disabled || !prompt.trim()}>
            <GitCompare className="mr-2 h-4 w-4" />
            Compare
          </Button>
        )}
        {toolbar}
      </div>
    </div>
  )
}
