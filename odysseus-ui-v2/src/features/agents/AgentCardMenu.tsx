import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, GraduationCap, MoreVertical, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AgentCardMenuAction {
  key: string
  label: string
  icon?: ReactNode
  danger?: boolean
  onClick: () => void
}

interface AgentCardMenuProps {
  actions: AgentCardMenuAction[]
  disabled?: boolean
}

export function AgentCardMenu({ actions, disabled }: AgentCardMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', close, true)
    return () => document.removeEventListener('click', close, true)
  }, [open])

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        className="rounded p-1 text-muted-foreground hover:bg-panel hover:text-foreground disabled:opacity-40"
        aria-label="Actions"
        title="Actions"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-panel py-1 shadow-lg">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-background',
                action.danger && 'text-destructive',
              )}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                action.onClick()
              }}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-background md:hidden"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function VerdictCheckedPill({ verdict }: { verdict: string }) {
  const tint =
    verdict === 'pass'
      ? 'bg-success/20 text-success'
      : verdict === 'fail'
        ? 'bg-destructive/20 text-destructive'
        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
  return (
    <span
      className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] inline-flex items-center gap-0.5', tint)}
      title={`Audited: ${verdict.replace(/_/g, ' ')}`}
    >
      <Check className="h-2.5 w-2.5" strokeWidth={3} />
      checked
    </span>
  )
}

export function TeacherMarkInline({ teacher }: { teacher?: string }) {
  return (
    <span
      className="text-amber-600 dark:text-amber-400"
      title={`Teacher rewrote this skill${teacher ? `: ${teacher}` : ''}`}
    >
      <GraduationCap className="size-3.5" aria-hidden />
    </span>
  )
}
