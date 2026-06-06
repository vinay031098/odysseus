import { cn } from '@/lib/utils'

export function SettingsCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-panel p-4', className)}>
      <h3 className="text-sm font-medium">{title}</h3>
      {description && <p className="mt-1 text-xs text-muted">{description}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-panel/50 p-4 text-sm text-muted">
      {children}
    </div>
  )
}
