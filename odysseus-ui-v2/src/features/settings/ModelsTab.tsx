import { useState } from 'react'
import { toast } from 'sonner'
import { DefaultModelSelect } from '@/features/settings/DefaultModelSelect'
import { EndpointForm } from '@/features/settings/EndpointForm'
import { EndpointList } from '@/features/settings/EndpointList'
import { useAuth } from '@/hooks/useAuth'
import { useEndpoints } from '@/hooks/useEndpoints'

export function ModelsTab() {
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin
  const {
    endpoints,
    isLoading,
    createEndpoint,
    createState,
    toggleEndpoint,
    deleteEndpoint,
    probeEndpoint,
    probeState,
    deleteState,
  } = useEndpoints(isAdmin)

  const [probingId, setProbingId] = useState<string | null>(null)

  async function handleCreate(values: {
    name: string
    base_url: string
    api_key: string
    model_type: string
    endpoint_kind: string
  }) {
    try {
      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(values.base_url)
      await createEndpoint({
        name: values.name || undefined,
        base_url: values.base_url,
        api_key: values.api_key || undefined,
        model_type: values.model_type,
        endpoint_kind: values.endpoint_kind,
        skip_probe: !isLocal,
      })
      toast.success('Endpoint added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add endpoint')
    }
  }

  async function handleProbe(id: string) {
    setProbingId(id)
    try {
      await probeEndpoint(id)
      toast.success('Probe complete')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Probe failed')
    } finally {
      setProbingId(null)
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    try {
      await toggleEndpoint({ id, is_enabled: enabled })
      toast.success(enabled ? 'Endpoint enabled' : 'Endpoint disabled')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this endpoint? Sessions using it may need reconfiguration.')) {
      return
    }
    try {
      await deleteEndpoint(id)
      toast.success('Endpoint deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <DefaultModelSelect />

      {isAdmin ? (
        <>
          <EndpointForm onSubmit={handleCreate} isSubmitting={createState.isPending} />
          {isLoading ? (
            <p className="text-sm text-muted">Loading endpoints…</p>
          ) : (
            <EndpointList
              endpoints={endpoints}
              probingId={probingId ?? (probeState.isPending ? probingId : null)}
              onProbe={handleProbe}
              onToggle={handleToggle}
              onDelete={handleDelete}
              deletingId={deleteState.isPending ? deleteState.variables : null}
            />
          )}
        </>
      ) : (
        <div className="rounded-lg border border-border bg-panel p-4 text-sm text-muted">
          Model endpoint management is available to administrators. You can still set your
          default chat model above from endpoints shared with your account.
        </div>
      )}
    </div>
  )
}
