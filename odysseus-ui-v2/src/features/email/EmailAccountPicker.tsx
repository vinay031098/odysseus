import type { EmailAccount } from '@/api/email-types'
import { cn } from '@/lib/utils'

type EmailAccountPickerProps = {
  accounts: EmailAccount[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function EmailAccountPicker({
  accounts,
  selectedId,
  onSelect,
}: EmailAccountPickerProps) {
  const enabled = accounts.filter((a) => a.enabled)
  if (enabled.length === 0) return null

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b border-border bg-panel/30 px-4 py-2"
      role="group"
      aria-label="Email accounts"
    >
      {enabled.length > 1 && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
            selectedId === null
              ? 'border-primary bg-primary/10 font-medium text-foreground'
              : 'border-border text-muted hover:bg-panel/60 hover:text-foreground',
          )}
          title="Use default account"
        >
          Default
        </button>
      )}
      {enabled.map((acc) => (
        <button
          key={acc.id}
          type="button"
          onClick={() => onSelect(acc.id)}
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
            selectedId === acc.id
              ? 'border-primary bg-primary/10 font-medium text-foreground'
              : 'border-border text-muted hover:bg-panel/60 hover:text-foreground',
          )}
          title={`${acc.from_address}${acc.is_default ? ' (default)' : ''}`}
        >
          {acc.name || acc.from_address}
        </button>
      ))}
    </div>
  )
}
