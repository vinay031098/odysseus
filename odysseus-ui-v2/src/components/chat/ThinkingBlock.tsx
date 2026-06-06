import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { MarkdownMessage } from '@/components/chat/MarkdownMessage'
import { cn } from '@/lib/utils'

interface ThinkingBlockProps {
  thinking: string
  defaultOpen?: boolean
  isStreaming?: boolean
}

export function ThinkingBlock({ thinking, defaultOpen = false, isStreaming }: ThinkingBlockProps) {
  const [open, setOpen] = useState(defaultOpen || isStreaming)
  if (!thinking.trim()) return null

  return (
    <div className="mb-3 rounded-lg border border-border/80 bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-muted-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{isStreaming ? 'Thinking…' : 'View thinking process'}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className={cn('border-t border-border px-3 py-2 text-xs text-muted-foreground')}>
          <MarkdownMessage content={thinking} />
        </div>
      )}
    </div>
  )
}
