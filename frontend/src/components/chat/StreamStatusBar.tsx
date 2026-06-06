import type { StreamLiveState } from '@/api/types'

interface StreamStatusBarProps {
  live: StreamLiveState
}

export function StreamStatusBar({ live }: StreamStatusBarProps) {
  if (!live.statusText && !live.thinking) return null
  return (
    <div className="mx-auto mb-2 max-w-3xl rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        {live.statusText ?? 'Thinking…'}
      </span>
    </div>
  )
}
