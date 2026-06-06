import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProviderPicker } from '@/features/settings/ProviderPicker'
import { CLOUD_PROVIDER_PRESETS } from '@/lib/providers'

export interface EndpointFormValues {
  name: string
  base_url: string
  api_key: string
  model_type: string
  endpoint_kind: string
}

interface EndpointFormProps {
  onSubmit: (values: EndpointFormValues) => Promise<void>
  isSubmitting?: boolean
}

const MODEL_TYPES = [
  { value: 'llm', label: 'LLM (chat)' },
  { value: 'image', label: 'Image' },
  { value: 'embedding', label: 'Embedding' },
]

const ENDPOINT_KINDS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'api', label: 'OpenAI-compatible API' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'proxy', label: 'Proxy' },
]

const selectClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'

export function EndpointForm({ onSubmit, isSubmitting }: EndpointFormProps) {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState(CLOUD_PROVIDER_PRESETS[1]?.url ?? '')
  const [providerUrl, setProviderUrl] = useState(CLOUD_PROVIDER_PRESETS[1]?.url ?? '')
  const [apiKey, setApiKey] = useState('')
  const [modelType, setModelType] = useState('llm')
  const [endpointKind, setEndpointKind] = useState('api')

  function handleProviderChange(url: string) {
    setProviderUrl(url)
    if (url) {
      setBaseUrl(url)
      setEndpointKind('api')
    }
  }

  function handleUrlInput(url: string) {
    setBaseUrl(url)
    const preset = CLOUD_PROVIDER_PRESETS.find((p) => p.url === url)
    setProviderUrl(preset?.url ?? '')
    if (!preset && url) setEndpointKind('api')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!baseUrl.trim()) return
    await onSubmit({
      name: name.trim(),
      base_url: baseUrl.trim(),
      api_key: apiKey.trim(),
      model_type: modelType,
      endpoint_kind: endpointKind,
    })
    setName('')
    setBaseUrl(CLOUD_PROVIDER_PRESETS[1]?.url ?? '')
    setProviderUrl(CLOUD_PROVIDER_PRESETS[1]?.url ?? '')
    setApiKey('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-panel p-4">
      <h3 className="text-sm font-medium">Add endpoint</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ep-name">Name (optional)</Label>
          <Input
            id="ep-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My OpenAI proxy"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Provider</Label>
          <ProviderPicker value={providerUrl} onChange={handleProviderChange} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ep-url">Base URL</Label>
          <Input
            id="ep-url"
            value={baseUrl}
            onChange={(e) => handleUrlInput(e.target.value)}
            placeholder="https://api.openai.com/v1"
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ep-key">API key (optional)</Label>
          <Input
            id="ep-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-…"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ep-type">Provider type</Label>
          <select
            id="ep-type"
            className={selectClass}
            value={modelType}
            onChange={(e) => setModelType(e.target.value)}
          >
            {MODEL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ep-kind">Endpoint kind</Label>
          <select
            id="ep-kind"
            className={selectClass}
            value={endpointKind}
            onChange={(e) => setEndpointKind(e.target.value)}
          >
            {ENDPOINT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting || !baseUrl.trim()}>
        {isSubmitting ? 'Adding…' : 'Add endpoint'}
      </Button>
    </form>
  )
}
