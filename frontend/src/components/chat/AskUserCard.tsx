import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { MarkdownMessage } from '@/components/chat/MarkdownMessage'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AskUserPayload } from '@/api/types'

interface AskUserCardProps {
  payload: AskUserPayload
  onSelect: (answer: string) => void
  onDismiss?: () => void
}

export function AskUserCard({ payload, onSelect, onDismiss }: AskUserCardProps) {
  const [otherText, setOtherText] = useState('')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const multi = Boolean(payload.multi)

  const options = useMemo(
    () =>
      payload.options
        .map((opt) => ({
          label: opt.label ? String(opt.label) : String(opt),
          description: opt.description ? String(opt.description) : '',
        }))
        .filter((opt) => opt.label),
    [payload.options],
  )

  const submitMulti = () => {
    const picked = options.filter((opt) => checked[opt.label]).map((opt) => opt.label)
    const free = otherText.trim()
    if (free) picked.push(free)
    if (picked.length) onSelect(picked.join(', '))
  }

  return (
    <div
      className="theme-ai-bubble max-w-[85%] rounded-2xl border px-4 py-3 text-sm"
      role="group"
      tabIndex={-1}
      aria-label={payload.question || 'Question from the assistant'}
    >
      <div className="mb-2 flex items-start justify-end">
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss question"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {payload.question ? (
        <div className="mb-3 font-medium">
          <MarkdownMessage content={payload.question} />
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        {options.map((opt) =>
          multi ? (
            <label
              key={opt.label}
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/40"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={Boolean(checked[opt.label])}
                onChange={(e) =>
                  setChecked((prev) => ({ ...prev, [opt.label]: e.target.checked }))
                }
              />
              <span>
                <span className="font-medium">{opt.label}</span>
                {opt.description ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">{opt.description}</span>
                ) : null}
              </span>
            </label>
          ) : (
            <button
              key={opt.label}
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/40"
              onClick={() => onSelect(opt.label)}
            >
              <span className="font-medium">{opt.label}</span>
              {opt.description ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">{opt.description}</span>
              ) : null}
            </button>
          ),
        )}
      </div>
      <div className={cn('mt-3 flex gap-2', multi ? 'flex-col sm:flex-row' : 'flex-col')}>
        <input
          type="text"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder={multi ? 'Other (added to selection)…' : 'Other… (type your own answer)'}
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (multi) submitMulti()
              else if (otherText.trim()) onSelect(otherText.trim())
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (multi) submitMulti()
            else if (otherText.trim()) onSelect(otherText.trim())
          }}
        >
          {multi ? 'Send selection' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
