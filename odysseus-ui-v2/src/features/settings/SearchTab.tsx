import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SettingsCard } from '@/features/settings/SettingsCard'
import { useAppSettings } from '@/hooks/useAppSettings'
import { SEARCH_PROVIDERS } from '@/lib/settings-fields'

export function SearchTab() {
  const { isAdmin, settings, save, isSaving } = useAppSettings()
  const [provider, setProvider] = useState('searxng')
  const [searchUrl, setSearchUrl] = useState('')
  const [resultCount, setResultCount] = useState('5')
  const [safesearch, setSafesearch] = useState('strict')

  useEffect(() => {
    if (!settings) return
    setProvider(String(settings.search_provider ?? 'searxng'))
    setSearchUrl(String(settings.search_url ?? ''))
    setResultCount(String(settings.search_result_count ?? 5))
    setSafesearch(String(settings.search_safesearch ?? 'strict'))
  }, [settings])

  async function handleSave() {
    if (!isAdmin) {
      toast.error('Admin only')
      return
    }
    try {
      await save({
        search_provider: provider,
        search_url: searchUrl,
        search_result_count: Number(resultCount) || 5,
        search_safesearch: safesearch,
      })
      toast.success('Search settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <SettingsCard title="Web search" description="Provider used for web search and deep research.">
      {isAdmin ? (
        <div className="space-y-3">
          <div>
            <Label htmlFor="search-provider">Provider</Label>
            <select
              id="search-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {SEARCH_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="search-url">URL (SearXNG / custom)</Label>
            <Input
              id="search-url"
              value={searchUrl}
              onChange={(e) => setSearchUrl(e.target.value)}
              placeholder="http://localhost:8080"
              className="mt-1"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="search-count">Result count</Label>
              <Input
                id="search-count"
                type="number"
                min={1}
                max={100}
                value={resultCount}
                onChange={(e) => setResultCount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="search-safe">SafeSearch</Label>
              <select
                id="search-safe"
                value={safesearch}
                onChange={(e) => setSafesearch(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="strict">Strict</option>
                <option value="moderate">Moderate</option>
                <option value="off">Off</option>
              </select>
            </div>
          </div>
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save search settings'}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted">Search configuration is admin-only.</p>
      )}
    </SettingsCard>
  )
}
