import { Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ModelEndpoint } from '@/api/types'
import { ProviderLogo } from '@/features/settings/ProviderPicker'
import { LangIcon, hasLangIcon } from '@/lib/langIcons'
import { findProviderPreset } from '@/lib/providers'

interface EndpointListProps {
  endpoints: ModelEndpoint[]
  probingId?: string | null
  onProbe: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
  deletingId?: string | null
}

function statusLabel(ep: ModelEndpoint): string {
  if (ep.status === 'online') return 'Online'
  if (ep.status === 'empty') return 'Reachable (no models)'
  if (ep.status === 'offline') return 'Offline'
  return ep.status
}

function statusColor(ep: ModelEndpoint): string {
  if (ep.online) return 'text-emerald-600 dark:text-emerald-400'
  return 'text-muted'
}

export function EndpointList({
  endpoints,
  probingId,
  onProbe,
  onToggle,
  onDelete,
  deletingId,
}: EndpointListProps) {
  if (endpoints.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
        No model endpoints configured yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {endpoints.map((ep) => {
        const preset = findProviderPreset(ep.base_url)
        return (
        <div
          key={ep.id}
          className="rounded-lg border border-border bg-panel p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {preset ? (
                  <ProviderLogo logoKey={preset.logoKey} />
                ) : null}
                <h4 className="font-medium">{ep.name}</h4>
                <span className={`text-xs ${statusColor(ep)}`}>{statusLabel(ep)}</span>
                {!ep.is_enabled && (
                  <span className="rounded bg-muted/20 px-1.5 py-0.5 text-xs text-muted">
                    Disabled
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-muted">{ep.base_url}</p>
              <p className="mt-2 text-xs text-muted">
                {ep.models.length} model{ep.models.length === 1 ? '' : 's'}
                {ep.has_key ? ' · API key set' : ''}
                {ep.model_type ? (
                  <>
                    {' · '}
                    <span className="inline-flex items-center gap-1">
                      {hasLangIcon(ep.model_type) ? (
                        <LangIcon lang={ep.model_type} size={12} />
                      ) : null}
                      {ep.model_type}
                    </span>
                  </>
                ) : null}
              </p>
              {ep.ping_error && (
                <p className="mt-1 text-xs text-red-500">{ep.ping_error}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onProbe(ep.id)}
                disabled={probingId === ep.id}
              >
                {probingId === ep.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-1.5">Probe</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onToggle(ep.id, !ep.is_enabled)}
              >
                {ep.is_enabled ? 'Disable' : 'Enable'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onDelete(ep.id)}
                disabled={deletingId === ep.id}
              >
                {deletingId === ep.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          {ep.models.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              {ep.models.slice(0, 8).map((model) => (
                <span key={model} className="inline-flex items-center gap-1">
                  {hasLangIcon(model) ? <LangIcon lang={model} size={11} /> : null}
                  {model}
                </span>
              ))}
              {ep.models.length > 8 ? ` +${ep.models.length - 8} more` : ''}
            </p>
          )}
        </div>
        )
      })}
    </div>
  )
}
