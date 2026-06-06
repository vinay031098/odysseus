import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ModelFallbackChain } from '@/features/settings/ModelFallbackChain'
import type { ModelEndpoint, ModelFallbackEntry } from '@/api/types'
import { useEndpoints } from '@/hooks/useEndpoints'
import { useModels } from '@/hooks/useModels'
import { useSettings } from '@/hooks/useSettings'

const selectClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'

export function DefaultModelSelect() {
  const { modelOptions, defaultChat, isLoading: modelsLoading } = useModels()
  const {
    isAdmin,
    savedEndpointId,
    savedModel,
    savedFallbacks,
    isLoading: settingsLoading,
    saveDefaultModel,
    saveDefaultModelState,
    saveFallbacks,
  } = useSettings()
  const { endpoints: adminEndpoints } = useEndpoints(isAdmin)

  const endpoints = useMemo((): ModelEndpoint[] => {
    if (isAdmin && adminEndpoints.length > 0) return adminEndpoints
    const map = new Map<string, ModelEndpoint>()
    for (const opt of modelOptions) {
      let ep = map.get(opt.endpointId)
      if (!ep) {
        ep = {
          id: opt.endpointId,
          name: opt.endpointName ?? opt.endpointId,
          base_url: opt.url,
          has_key: false,
          is_enabled: true,
          models: [],
          online: !opt.offline,
          status: opt.offline ? 'offline' : 'online',
        }
        map.set(opt.endpointId, ep)
      }
      if (!opt.offline && !ep.models.includes(opt.id)) {
        ep.models.push(opt.id)
      }
    }
    return [...map.values()]
  }, [adminEndpoints, isAdmin, modelOptions])

  const endpointChoices = useMemo(() => {
    const seen = new Map<string, string>()
    for (const opt of modelOptions) {
      if (!seen.has(opt.endpointId)) {
        seen.set(opt.endpointId, opt.endpointName ?? opt.endpointId)
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  }, [modelOptions])

  const [endpointId, setEndpointId] = useState('')
  const [modelId, setModelId] = useState('')
  const [fallbacks, setFallbacks] = useState<ModelFallbackEntry[]>([])

  useEffect(() => {
    if (settingsLoading) return
    const ep = savedEndpointId || defaultChat?.endpoint_id || endpointChoices[0]?.id || ''
    const model =
      savedModel ||
      defaultChat?.model ||
      modelOptions.find((m) => m.endpointId === ep)?.id ||
      ''
    setEndpointId(ep)
    setModelId(model)
    setFallbacks(savedFallbacks.map((f) => ({ endpoint_id: f.endpoint_id, model: f.model })))
  }, [
    savedEndpointId,
    savedModel,
    savedFallbacks,
    defaultChat,
    endpointChoices,
    modelOptions,
    settingsLoading,
  ])

  const modelsForEndpoint = useMemo(
    () => modelOptions.filter((m) => m.endpointId === endpointId && !m.offline),
    [modelOptions, endpointId],
  )

  useEffect(() => {
    if (!modelId && modelsForEndpoint.length > 0) {
      setModelId(modelsForEndpoint[0].id)
    }
  }, [modelsForEndpoint, modelId])

  async function handleSave() {
    if (!endpointId || !modelId) {
      toast.error('Select an endpoint and model')
      return
    }
    try {
      await saveDefaultModel({ endpointId, model: modelId })
      toast.success('Default model saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save default model')
    }
  }

  async function handleSaveFallbacks(next: ModelFallbackEntry[]) {
    try {
      await saveFallbacks(next)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save fallbacks')
      throw err
    }
  }

  const loading = modelsLoading || settingsLoading

  return (
    <div className="space-y-4 rounded-lg border border-border bg-panel p-4">
      <div>
        <h3 className="text-sm font-medium">Default chat model</h3>
        <p className="mt-1 text-xs text-muted">
          Used for new chats when no model is selected.
          {defaultChat?.model && (
            <>
              {' '}
              Active: <span className="text-foreground">{defaultChat.model}</span>
            </>
          )}
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted">Loading models…</p>
      ) : endpointChoices.length === 0 ? (
        <p className="text-sm text-muted">
          No endpoints available. Add a model endpoint first (admin) or connect your own.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="default-ep">Endpoint</Label>
            <select
              id="default-ep"
              className={selectClass}
              value={endpointId}
              onChange={(e) => {
                setEndpointId(e.target.value)
                setModelId('')
              }}
            >
              {endpointChoices.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-model">Model</Label>
            <select
              id="default-model"
              className={selectClass}
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={modelsForEndpoint.length === 0}
            >
              {modelsForEndpoint.length === 0 ? (
                <option value="">No models</option>
              ) : (
                modelsForEndpoint.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      )}
      <Button
        type="button"
        onClick={handleSave}
        disabled={saveDefaultModelState.isPending || loading || !endpointId || !modelId}
      >
        {saveDefaultModelState.isPending ? 'Saving…' : 'Save default'}
      </Button>

      {!loading && endpoints.length > 0 && (
        <ModelFallbackChain
          fallbacks={fallbacks}
          endpoints={endpoints}
          onChange={setFallbacks}
          onSave={handleSaveFallbacks}
        />
      )}
    </div>
  )
}
