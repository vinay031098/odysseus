import { ChevronDown } from 'lucide-react'
import type { ModelOption } from '@/api/types'
import { LangIcon, hasLangIcon } from '@/lib/langIcons'
import { cn } from '@/lib/utils'

interface ModelPickerProps {
  models: ModelOption[]
  value: string | null
  onChange: (model: ModelOption) => void
  disabled?: boolean
}

export function ModelPicker({ models, value, onChange, disabled }: ModelPickerProps) {
  const selected = models.find((m) => m.id === value)
  const iconLang =
    selected && (hasLangIcon(selected.id) ? selected.id : hasLangIcon(selected.label) ? selected.label : null)

  return (
    <div className="relative inline-flex items-center">
      {iconLang ? <LangIcon lang={iconLang} size={14} className="mr-1.5" /> : null}
      <select
        className={cn(
          'appearance-none rounded-md border border-border bg-background',
          'py-1.5 pl-3 pr-8 text-sm font-medium',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        value={value ?? ''}
        disabled={disabled || !models.length}
        onChange={(e) => {
          const model = models.find((m) => m.id === e.target.value)
          if (model) onChange(model)
        }}
      >
        {!models.length && <option value="">No models</option>}
        {models.map((m) => (
          <option key={`${m.endpointId}-${m.id}`} value={m.id}>
            {m.label}
            {m.offline ? ' (offline)' : ''}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-muted-foreground" />
      {selected?.endpointName && (
        <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
          {selected.endpointName}
        </span>
      )}
    </div>
  )
}
