import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, Globe, Search } from 'lucide-react'
import type { RagSource, WebSource } from '@/api/types'
import { cn } from '@/lib/utils'

function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

interface WebSourcesListProps {
  sources: WebSource[]
  label: string
  icon?: 'web' | 'research'
}

export function WebSourcesList({ sources, label, icon = 'web' }: WebSourcesListProps) {
  const [open, setOpen] = useState(false)
  if (!sources.length) return null
  const Icon = icon === 'research' ? Search : Globe

  return (
    <div className="mb-3 rounded-lg border border-border bg-muted/30 text-xs">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" />
          {sources.length} {label}
        </span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="space-y-1 border-t border-border px-3 py-2">
          {sources.map((s, i) => (
            <a
              key={`${s.url}-${i}`}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 rounded px-1 py-1 hover:bg-muted/50"
            >
              <span className="mt-0.5 text-muted-foreground">{i + 1}.</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.title || sourceDomain(s.url)}</span>
                <span className="block truncate text-muted-foreground">{sourceDomain(s.url)}</span>
              </span>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export function RagSourcesList({ sources }: { sources: RagSource[] }) {
  if (!sources.length) return null
  return (
    <details className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
      <summary className="cursor-pointer font-medium">
        Sources ({sources.length} documents)
      </summary>
      <div className="mt-2 space-y-2">
        {sources.map((s, i) => (
          <div key={`${s.filename}-${i}`}>
            <div className="font-medium">
              {s.filename}
              {typeof s.similarity === 'number' && (
                <span className="ml-2 text-muted-foreground">
                  {(s.similarity * 100).toFixed(1)}%
                </span>
              )}
            </div>
            {s.snippet && <p className="text-muted-foreground">{s.snippet}</p>}
          </div>
        ))}
      </div>
    </details>
  )
}

export function MessageSources({
  webSources,
  researchSources,
  ragSources,
  className,
}: {
  webSources?: WebSource[]
  researchSources?: WebSource[]
  ragSources?: RagSource[]
  className?: string
}) {
  return (
    <div className={cn(className)}>
      {webSources?.length ? <WebSourcesList sources={webSources} label="web sources" /> : null}
      {researchSources?.length ? (
        <WebSourcesList sources={researchSources} label="research sources" icon="research" />
      ) : null}
      {ragSources?.length ? <RagSourcesList sources={ragSources} /> : null}
    </div>
  )
}
