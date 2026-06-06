import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { CLOUD_PROVIDER_PRESETS, providerLogo } from '@/lib/providers'
import { cn } from '@/lib/utils'

interface ProviderPickerProps {
  value: string
  onChange: (url: string) => void
  className?: string
}

function ProviderLogo({ logoKey }: { logoKey: string }) {
  const svg = providerLogo(logoKey)
  if (!svg) {
    return (
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-medium">
        ?
      </span>
    )
  }
  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 text-foreground [&>svg]:h-full [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export function ProviderPicker({ value, onChange, className }: ProviderPickerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const preset = CLOUD_PROVIDER_PRESETS.find((p) => p.url === value)
  const label = preset?.label ?? (value ? 'Custom URL' : 'Custom URL')

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          {preset ? <ProviderLogo logoKey={preset.logoKey} /> : null}
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-panel py-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-background',
              !value && 'bg-background/60',
            )}
            onClick={() => {
              onChange('')
              setOpen(false)
            }}
          >
            Custom URL
          </button>
          {CLOUD_PROVIDER_PRESETS.map((p) => (
            <button
              key={p.url}
              type="button"
              role="option"
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-background',
                value === p.url && 'bg-background/60',
              )}
              onClick={() => {
                onChange(p.url)
                setOpen(false)
              }}
            >
              <ProviderLogo logoKey={p.logoKey} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { ProviderLogo }
